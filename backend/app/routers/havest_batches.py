# backend/app/routers/havest_batches.py
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.routers.user import require_role, ensure_owns_org
from app.crud import havest_batches as crud_batches
from app.crud import batch_seasons as crud_bs
from app.utils.batch_code import validate_batch_code
from app.utils.qr_generator import generate_qr_url
from app.schemas.havest_batches import (
    HarvestBatchCreate,
    HarvestBatchUpdate,
    HarvestBatchSummary,
    HarvestBatchDetail,
    HarvestBatchStatus,
)

router = APIRouter()


@router.get("", response_model=list[HarvestBatchSummary])
def list_harvest_batches(
    org_id: UUID | None = Query(None, description="Lọc theo nông trại (Admin/Owner)"),
    status_filter: HarvestBatchStatus | None = Query(None, alias="status", description="Lọc theo trạng thái"),
    keyword: str | None = Query(None, description="Tìm theo mã lô BATCH-..."),
    date_from: date | None = Query(None, description="Từ ngày thu hoạch"),
    date_to: date | None = Query(None, description="Đến ngày thu hoạch"),
    include_cancelled: bool = Query(False, description="Bao gồm các lô đã bị xóa mềm (cancelled)"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    role = current_user["role"]

    if role == "admin":
        scope_org_id = org_id
        scope_owner_id = None
    elif role == "owner":
        if org_id:
            ensure_owns_org(db, current_user, org_id)
            scope_org_id = org_id
            scope_owner_id = None
        else:
            scope_org_id = None
            scope_owner_id = current_user["user_id"]
    else:  # leader, worker
        user_org_id = current_user.get("org_id")
        if not user_org_id:
            return []
        if org_id and org_id != user_org_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn không có quyền xem lô thu hoạch của nông trại khác")
        scope_org_id = user_org_id
        scope_owner_id = None

    return crud_batches.list_harvest_batches(
        db,
        org_id=scope_org_id,
        status=status_filter.value if status_filter else None,
        keyword=keyword,
        owner_id=scope_owner_id,
        date_from=date_from,
        date_to=date_to,
        include_cancelled=include_cancelled,
    )


@router.get("/{batch_id}", response_model=HarvestBatchDetail)
def get_harvest_batch_detail(
    batch_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    batch = crud_batches.get_harvest_batch(db, batch_id)
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy lô thu hoạch")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, batch["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != batch["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn không thuộc nông trại quản lý lô thu hoạch này")

    return batch


@router.post("", response_model=HarvestBatchDetail, status_code=status.HTTP_201_CREATED)
def create_harvest_batch(
    payload: HarvestBatchCreate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, payload.org_id)

    if not payload.initial_seasons:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Lô thu hoạch bắt buộc phải liên kết với ít nhất một mùa vụ để đảm bảo truy xuất nguồn gốc",
        )

    if payload.batch_code:
        if not validate_batch_code(payload.batch_code):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Mã lô không đúng định dạng chuẩn (AGT-xxxx-YYYYMMDD-xxxx hoặc BATCH-...)",
            )
        if crud_batches.batch_code_exists(db, payload.batch_code):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Mã lô '{payload.batch_code}' đã tồn tại")

    # Tính sản lượng khởi tạo từ các mùa vụ đóng góp
    initial_qty = sum(s.contributed_quantity for s in payload.initial_seasons)

    batch = crud_batches.create_harvest_batch(
        db,
        org_id=payload.org_id,
        batch_code=payload.batch_code,
        quantity=initial_qty,
        harvest_date=payload.harvest_date,
        status=payload.status.value if payload.status else "pending",
        qr_url=payload.qr_url,
    )

    # Gộp các mùa vụ ban đầu
    for s_item in payload.initial_seasons:
        is_valid, err_msg, _ = crud_bs.validate_batch_and_season(db, batch["batch_id"], s_item.season_id)
        if not is_valid:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Mùa vụ {s_item.season_id}: {err_msg}")
        crud_bs.create_or_reactivate_batch_season(
            db,
            batch_id=batch["batch_id"],
            season_id=s_item.season_id,
            contributed_quantity=s_item.contributed_quantity,
        )

    return crud_batches.get_harvest_batch(db, batch["batch_id"])


@router.put("/{batch_id}", response_model=HarvestBatchDetail)
@router.patch("/{batch_id}", response_model=HarvestBatchDetail)
def update_harvest_batch(
    batch_id: UUID,
    payload: HarvestBatchUpdate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin lô thu hoạch (ngày thu hoạch, trạng thái, mã QR)."""
    batch = crud_batches.get_harvest_batch(db, batch_id)
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy lô thu hoạch")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, batch["org_id"])

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Không có dữ liệu cập nhật")

    if "batch_code" in data and data["batch_code"]:
        if not validate_batch_code(data["batch_code"]):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Mã lô không đúng định dạng chuẩn (AGT-xxxx-YYYYMMDD-xxxx hoặc BATCH-...)",
            )
        if crud_batches.batch_code_exists(db, data["batch_code"], exclude_batch_id=batch_id):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Mã lô '{data['batch_code']}' đã tồn tại")

    # Kiểm tra xung đột trường quantity khi lô đã có mùa vụ đóng góp
    if "quantity" in data and batch.get("seasons_count", 0) > 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Lô thu hoạch đã có mùa vụ đóng góp. Vui lòng cập nhật sản lượng từng mùa vụ qua API /batch-seasons để hệ thống tự động đồng bộ tổng sản lượng.",
        )

    if "status" in data and isinstance(data["status"], HarvestBatchStatus):
        data["status"] = data["status"].value

    updated = crud_batches.update_harvest_batch(db, batch_id, data)
    return updated


@router.post("/{batch_id}/generate-qr", response_model=HarvestBatchDetail)
def generate_batch_qr(
    batch_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """UC-O04.3: Chủ nông trại kích hoạt lệnh tạo mã QR / Tem nhãn cho lô thu hoạch."""
    batch = crud_batches.get_harvest_batch(db, batch_id)
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy lô thu hoạch")

    if current_user["role"] == "owner":
        ensure_owns_org(db, current_user, batch["org_id"])

    if batch["status"] == "cancelled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Không thể sinh mã QR cho lô đã bị hủy")

    if not batch.get("batch_code"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lô thu hoạch chưa có mã định danh hợp lệ để sinh QR")

    qr_url = generate_qr_url(batch["batch_code"])
    updated = crud_batches.update_harvest_batch(
        db,
        batch_id,
        {"qr_url": qr_url, "status": HarvestBatchStatus.ready.value},
    )
    return updated


@router.delete("/{batch_id}", response_model=HarvestBatchDetail)
def delete_harvest_batch(
    batch_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):

    batch = crud_batches.get_harvest_batch(db, batch_id)
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy lô thu hoạch")

    if current_user["role"] == "owner":
        ensure_owns_org(db, current_user, batch["org_id"])

    deleted_batch = crud_batches.soft_delete_harvest_batch(db, batch_id)
    return deleted_batch