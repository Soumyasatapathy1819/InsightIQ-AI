from sqlalchemy import text

from connection import get_database_engine


def test_connection():
    engine = get_database_engine()

    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database();")
        )

        database_name = result.scalar()

        print("Database connection successful!")
        print(f"Connected database: {database_name}")


if __name__ == "__main__":
    test_connection()
    