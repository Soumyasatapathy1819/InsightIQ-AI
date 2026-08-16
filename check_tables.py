from database.connection import get_database_engine
import pandas as pd

engine = get_database_engine()

query = """
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"""

df = pd.read_sql(query, engine)

print("\n====================================")
print("       DATABASE TABLES")
print("====================================")

print(df.to_string(index=False))