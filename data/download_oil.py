import yfinance as yf
import pandas as pd

print("Downloading WTI crude oil data...")

oil = yf.download(
    "CL=F",
    start="2022-04-01",
    end="2026-08-12",
    auto_adjust=False,
    progress=False
)

# Handle yfinance MultiIndex columns
if isinstance(oil.columns, pd.MultiIndex):
    oil.columns = oil.columns.get_level_values(0)

oil = oil.reset_index()

# Keep required columns
oil = oil[["Date", "Close"]]

oil = oil.rename(columns={
    "Date": "date",
    "Close": "oil_price"
})

oil["date"] = pd.to_datetime(oil["date"]).dt.date

oil = oil.dropna()

oil.to_csv(
    "data/oil_prices.csv",
    index=False
)

print("\nOil data saved successfully!")
print(f"Rows: {len(oil)}")
print(f"Date range: {oil['date'].min()} -> {oil['date'].max()}")
print("\nFirst 5 rows:")
print(oil.head())

print("\nFile created:")
print("data/oil_prices.csv")