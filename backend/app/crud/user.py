from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID


def get_user_by_phone(db: Session, phone: str) -> dict | None:
    row = db.execute(text("SELECT * FROM users WHERE phone = :phone"), {"phone": phone}).mappings().first()
    return dict(row) if row else None


def get_user(db: Session, user_id: UUID) -> dict | None:
    row = db.execute(text("SELECT * FROM users WHERE user_id = :user_id"), {"user_id": user_id}).mappings().first()
    return dict(row) if row else None

def update_password(db: Session, user_id: UUID, new_password_hash: str) -> None:
    db.execute(
        text("UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id"),
        {"password_hash": new_password_hash, "user_id": user_id},
    )
    db.commit()

# HELPER KIEM TRA TRUNG - de router bao loi than thien (400)
# thay vi de rot xuong loi constraint 500 kho doc cua Postgres 
def phone_exists(db: Session, phone: str) -> bool:
    row = db.execute(text("SELECT 1 FROM users WHERE phone = :phone"), {"phone": phone}).first()
    return row is not None
 
 
def national_id_exists(db: Session, national_id: str | None) -> bool:
    if not national_id:
        return False
    row = db.execute(
        text("SELECT 1 FROM users WHERE national_id = :national_id"),
        {"national_id": national_id},
    ).first()
    return row is not None
 
 
# TAO MOI - UC-A01.1 (owner) / UC-O05.1 (worker) 
def _insert_user(
    db: Session,
    *,
    full_name: str,
    phone: str,
    password_hash: str,
    role: str,
    org_id: UUID | None,
    national_id: str | None = None,
    date_of_birth=None,
    address: str | None = None,
) -> dict:
    """
    Ham dung chung cho create_owner/create_staff. status/team_id khong
    truyen vao INSERT - de DB tu ap DEFAULT ('active' / NULL) dung nhu
    da khai bao trong init_db.sql.
    """
    row = db.execute(
        text("""
            INSERT INTO users
                (full_name, phone, national_id, date_of_birth, address,
                 password_hash, role, org_id)
            VALUES
                (:full_name, :phone, :national_id, :date_of_birth, :address,
                 :password_hash, :role, :org_id)
            RETURNING *
        """),
        {
            "full_name": full_name,
            "phone": phone,
            "national_id": national_id,
            "date_of_birth": date_of_birth,
            "address": address,
            "password_hash": password_hash,
            "role": role,
            "org_id": org_id,
        },
    ).mappings().first()
    db.commit()
    return dict(row)
 
 
def create_owner(
    db: Session,
    *,
    full_name: str,
    phone: str,
    password_hash: str,
    national_id: str | None = None,
    date_of_birth=None,
    address: str | None = None,
) -> dict:
    """UC-A01.1 - Admin tao tai khoan Owner. org_id = NULL (Owner se tu tao
    nong trai sau o UC-O01.1, luc do moi back-fill org_id)."""
    return _insert_user(
        db,
        full_name=full_name,
        phone=phone,
        password_hash=password_hash,
        role="owner",
        org_id=None,
        national_id=national_id,
        date_of_birth=date_of_birth,
        address=address,
    )
 
 
def create_staff(
    db: Session,
    *,
    org_id: UUID,
    full_name: str,
    phone: str,
    password_hash: str,
    national_id: str | None = None,
    date_of_birth=None,
    address: str | None = None,
) -> dict:
    """UC-O05.1 - Owner tao nhan su moi cho nong trai cua minh.
    role mac dinh 'worker' - luong 2 buoc: muon phong leader thi goi
    tiep update_role() rieng."""
    return _insert_user(
        db,
        full_name=full_name,
        phone=phone,
        password_hash=password_hash,
        role="worker",
        org_id=org_id,
        national_id=national_id,
        date_of_birth=date_of_birth,
        address=address,
    )
 
 

# DANH SACH + TIM KIEM - UC-SH04.1 
def list_users(
    db: Session,
    *,
    org_id: UUID | None = None,
    team_id: UUID | None = None,
    keyword: str | None = None,
    role: str | None = None,
    status: str | None = None,
) -> list[dict]:
    """
    Tra ve ban rut gon (dung cho UserSummary): user_id, full_name, phone,
    role, status. Ham nay khong tu quyet dinh filter nao duoc phep dung -
    router se quyet dinh org_id/team_id duoc truyen hay khong tuy role
    nguoi goi (Admin/Owner/Leader).
    """
    conditions = []
    params: dict = {}
 
    if org_id is not None:
        conditions.append("org_id = :org_id")
        params["org_id"] = org_id
    if team_id is not None:
        conditions.append("team_id = :team_id")
        params["team_id"] = team_id
    if role is not None:
        conditions.append("role = :role")
        params["role"] = role
    if status is not None:
        conditions.append("status = :status")
        params["status"] = status
    if keyword:
        conditions.append("(full_name ILIKE :keyword OR phone ILIKE :keyword)")
        params["keyword"] = f"%{keyword}%"
 
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
 
    rows = db.execute(
        text(f"""
            SELECT user_id, full_name, phone, role, status
            FROM users
            {where_clause}
            ORDER BY full_name
        """),
        params,
    ).mappings().all()
    return [dict(r) for r in rows]
 
 
# CAP NHAT THONG TIN COT LOI - UC-O05.2 
def update_user(db: Session, user_id: UUID, data: dict) -> dict | None:
    """
    data: dict field muon sua - lay tu
    UserUpdate.model_dump(exclude_unset=True) o router, nen key luon
    nam trong tap field da duoc Pydantic whitelist san (full_name, phone,
    national_id, date_of_birth, address). KHONG duoc truyen thang
    request.json() tho vao day vi dang build SET clause bang f-string.
    """
    if not data:
        return get_user(db, user_id)
 
    set_clause = ", ".join(f"{key} = :{key}" for key in data.keys())
    params = {**data, "user_id": user_id}
 
    row = db.execute(
        text(f"UPDATE users SET {set_clause} WHERE user_id = :user_id RETURNING *"),
        params,
    ).mappings().first()
    db.commit()
    return dict(row) if row else None
 
 
# DOI VAI TRO - UC-O05.3 / UC-A01.3 / UC-O06.3
 
def update_role(db: Session, user_id: UUID, role: str, team_id: UUID | None) -> dict | None:
    """
    TODO(team-module): ham nay dung nguoi vao ca bang teams (khong chi
    users). Tam thoi de o day vi crud/team.py chua ton tai; khi lam module
    Team that su, can xem xet chuyen phan logic dung teams sang
    crud/team.py (vi du 2 ham noi bo set_leader()/clear_leader()) va ham
    nay chi con goi lai chung, thay vi viet thang UPDATE teams tai day.
 
    role: "leader" | "worker" (khop AssignableRole ben schema)
    team_id: bat buoc neu role="leader", phai la None neu role="worker"
             (da duoc UserRoleUpdate validate truoc khi toi day).
 
    Ham nay GIA DINH router da validate xong:
      - team_id (neu co) thuoc dung org cua caller
      - team do chua co leader, hoac leader hien tai chinh la user nay
 
    Luu y quan trong ve team_id cua chinh user khi ha chuc xuong worker:
    KHONG dong (clear) users.team_id - vi team_leader_id (ai la truong
    nhom) va team_id cua 1 user (ai thuoc nhom nao) la 2 khai niem khac
    nhau. Ha chuc chi go vai tro truong nhom, nguoi do van la thanh vien
    binh thuong cua team cu (viec doi team cho worker thuoc UC-O06.2,
    khong xu ly o day).
    """
    current = get_user(db, user_id)
    if current is None:
        return None
 
    old_role = current["role"]
    old_team_id = current["team_id"]
 
    if role == "leader":
        # Leader phai thuoc chinh team ma minh dan dat
        db.execute(
            text("UPDATE users SET role = 'leader', team_id = :team_id WHERE user_id = :user_id"),
            {"team_id": team_id, "user_id": user_id},
        )
        # Neu truoc do dang la leader cua 1 team KHAC, go leader cu truoc
        if old_role == "leader" and old_team_id is not None and old_team_id != team_id:
            db.execute(
                text("""
                    UPDATE teams SET team_leader_id = NULL
                    WHERE team_id = :old_team_id AND team_leader_id = :user_id
                """),
                {"old_team_id": old_team_id, "user_id": user_id},
            )
        # Gan lam truong nhom cua team moi
        db.execute(
            text("UPDATE teams SET team_leader_id = :user_id WHERE team_id = :team_id"),
            {"user_id": user_id, "team_id": team_id},
        )
 
    else:  # role == "worker"
        db.execute(
            text("UPDATE users SET role = 'worker' WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        # Ha chuc: neu dang la leader cua 1 team thi go leader o team do
        if old_role == "leader" and old_team_id is not None:
            db.execute(
                text("""
                    UPDATE teams SET team_leader_id = NULL
                    WHERE team_id = :old_team_id AND team_leader_id = :user_id
                """),
                {"old_team_id": old_team_id, "user_id": user_id},
            )
 
    db.commit()
    return get_user(db, user_id)
 
 
# KHOA / MO KHOA - UC-O05.4 / UC-A01.2 (da toi gian)
 
def update_status(db: Session, user_id: UUID, status: str) -> dict | None:
    row = db.execute(
        text("UPDATE users SET status = :status WHERE user_id = :user_id RETURNING *"),
        {"status": status, "user_id": user_id},
    ).mappings().first()
    db.commit()
    return dict(row) if row else None

# HELPER DOC BANG teams - CHI phuc vu validate o route doi role

def get_team(db: Session, team_id: UUID) -> dict | None:
    """
    TODO(team-module): thuoc ve crud/team.py trong tuong lai, tam thoi
    de o day cung ly do voi update_role(). Router dung ham nay de kiem
    tra: team co ton tai khong, thuoc dung org khong, da co leader chua -
    truoc khi cho phep phong 1 nguoi lam To truong (UC-O05.3/UC-O06.3).
    """
    row = db.execute(text("SELECT * FROM teams WHERE team_id = :team_id"), {"team_id": team_id}).mappings().first()
    return dict(row) if row else None