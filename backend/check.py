import traceback
try:
    from database import SessionLocal
    from routers.auth_router import seed_admin
    db = SessionLocal()
    seed_admin(db)
    print("SEED OK")
except Exception as e:
    with open("err.txt", "w") as f:
        traceback.print_exc(file=f)
