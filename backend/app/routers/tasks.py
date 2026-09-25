# backend/app/routers/tasks.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.routers.user import require_role, ensure_owns_org
from app.crud import tasks as crud_tasks
from app.crud import team as crud_team
from app.schemas.tasks import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskSummary,
    TaskDetail,
    TaskStatus,
)

router = APIRouter()


@router.get("", response_model=list[TaskSummary])
def list_tasks(
    org_id: UUID | None = Query(None, description="Lọc theo nông trại (Admin hoặc Owner)"),
    team_id: UUID | None = Query(None, description="Lọc theo tổ công nhân"),
    worker_id: UUID | None = Query(None, description="Lọc theo công nhân"),
    plot_id: UUID | None = Query(None, description="Lọc theo lô đất"),
    status_filter: TaskStatus | None = Query(None, alias="status", description="Lọc theo trạng thái"),
    keyword: str | None = Query(None, description="Tìm theo nội dung, tên công nhân hoặc mã lô"),
    include_cancelled: bool = Query(False, description="Bao gồm các nhiệm vụ đã bị xóa mềm (cancelled)"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    role = current_user["role"]

    if role == "admin":
        scope_org_id = org_id
        scope_owner_id = None
        scope_team_id = team_id
        scope_worker_id = worker_id
    elif role == "owner":
        if org_id:
            ensure_owns_org(db, current_user, org_id)
            scope_org_id = org_id
            scope_owner_id = None
        else:
            scope_org_id = None
            scope_owner_id = current_user["user_id"]
        scope_team_id = team_id
        scope_worker_id = worker_id
    elif role == "leader":
        user_team_id = current_user.get("team_id")
        if not user_team_id:
            return []
        if team_id and team_id != user_team_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tổ trưởng chỉ được xem nhiệm vụ của tổ mình")
        scope_org_id = current_user.get("org_id")
        scope_owner_id = None
        scope_team_id = user_team_id
        scope_worker_id = worker_id
    else:  # worker
        scope_org_id = current_user.get("org_id")
        scope_owner_id = None
        scope_team_id = None
        scope_worker_id = current_user["user_id"]

    return crud_tasks.list_tasks(
        db,
        org_id=scope_org_id,
        team_id=scope_team_id,
        worker_id=scope_worker_id,
        plot_id=plot_id,
        status=status_filter.value if status_filter else None,
        keyword=keyword,
        owner_id=scope_owner_id,
        include_cancelled=include_cancelled,
    )


@router.get("/{task_id}", response_model=TaskDetail)
def get_task_detail(
    task_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    task = crud_tasks.get_task(db, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy nhiệm vụ")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, task["org_id"])
    elif role == "leader":
        if current_user.get("team_id") != task["team_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn không có quyền xem nhiệm vụ của tổ khác")
    elif role == "worker":
        if current_user["user_id"] != task["worker_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn chỉ được xem nhiệm vụ được giao cho chính mình")

    return task


@router.post("", response_model=TaskDetail, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):

    role = current_user["role"]

    if role == "leader":
        user_team_id = current_user.get("team_id")
        if not user_team_id or payload.team_id != user_team_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tổ trưởng chỉ được giao việc cho tổ của mình")

    is_valid, err_msg, org_id = crud_tasks.validate_task_context(
        db,
        team_id=payload.team_id,
        worker_id=payload.worker_id,
        plot_id=payload.plot_id,
    )
    if not is_valid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, err_msg)

    if role == "owner":
        ensure_owns_org(db, current_user, org_id)

    new_task = crud_tasks.create_task(
        db,
        team_id=payload.team_id,
        worker_id=payload.worker_id,
        plot_id=payload.plot_id,
        content=payload.content,
        due_date=payload.due_date,
    )
    return new_task


@router.put("/{task_id}", response_model=TaskDetail)
@router.patch("/{task_id}", response_model=TaskDetail)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):

    task = crud_tasks.get_task(db, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy nhiệm vụ")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, task["org_id"])
    elif role == "leader":
        if current_user.get("team_id") != task["team_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn chỉ được chỉnh sửa nhiệm vụ của tổ mình")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Không có dữ liệu cập nhật")


    new_team_id = data.get("team_id", task["team_id"])
    new_worker_id = data.get("worker_id", task["worker_id"])
    new_plot_id = data.get("plot_id", task["plot_id"])

    if role == "leader" and new_team_id != current_user.get("team_id"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tổ trưởng không thể chuyển nhiệm vụ sang tổ khác")

    if any(k in data for k in ("team_id", "worker_id", "plot_id")):
        is_valid, err_msg, org_id = crud_tasks.validate_task_context(
            db,
            team_id=new_team_id,
            worker_id=new_worker_id,
            plot_id=new_plot_id,
        )
        if not is_valid:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, err_msg)
        if role == "owner":
            ensure_owns_org(db, current_user, org_id)


    if "status" in data and isinstance(data["status"], TaskStatus):
        data["status"] = data["status"].value

    updated = crud_tasks.update_task(db, task_id, data)
    return updated


@router.patch("/{task_id}/status", response_model=TaskDetail)
def update_task_status(
    task_id: UUID,
    payload: TaskStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    task = crud_tasks.get_task(db, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy nhiệm vụ")

    role = current_user["role"]
    if role == "worker":
        if current_user["user_id"] != task["worker_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn chỉ được cập nhật trạng thái nhiệm vụ của chính mình")
        if payload.status == TaskStatus.cancelled:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Công nhân không có quyền hủy nhiệm vụ")
        if payload.status == TaskStatus.completed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Chỉ Tổ trưởng mới có thẩm quyền đánh giá nghiệm thu (ĐẠT) nhiệm vụ"
            )
    elif role == "leader":
        if current_user.get("team_id") != task["team_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tổ trưởng chỉ được cập nhật nhiệm vụ của tổ mình")
    elif role == "owner":
        ensure_owns_org(db, current_user, task["org_id"])

    updated = crud_tasks.update_task(db, task_id, {"status": payload.status.value})
    return updated


@router.delete("/{task_id}", response_model=TaskDetail)
def delete_task(
    task_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):

    task = crud_tasks.get_task(db, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy nhiệm vụ")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, task["org_id"])
    elif role == "leader":
        if current_user.get("team_id") != task["team_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn chỉ có thể hủy nhiệm vụ thuộc tổ của mình")

    deleted_task = crud_tasks.soft_delete_task(db, task_id)
    return deleted_task