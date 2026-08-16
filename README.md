# InsightIQ AI

### AI-Powered Currency Intelligence & Analytics Platform

InsightIQ AI is an end-to-end data analytics and machine learning platform for analyzing and forecasting **USD/INR exchange rates** using historical **RBI reference-rate data** and external **WTI crude-oil price signals**.

The platform combines automated data ingestion, PostgreSQL storage, feature engineering, statistical analytics, machine learning, and an interactive React dashboard into a single analytics pipeline.

---

## 🚀 Key Features

* 📊 **RBI Exchange Rate Analytics**

  * Historical USD/INR and other currency reference rates
  * Daily percentage changes
  * 7-day and 30-day moving averages
  * Volatility analysis

* 🛢️ **WTI Crude Oil Integration**

  * External crude-oil price data
  * Integration with currency analytics
  * Analysis of potential relationships between oil prices and USD/INR

* 🤖 **Machine Learning**

  * USD/INR next-rate prediction
  * Random Forest-based modeling
  * Baseline model comparison
  * Direction prediction experiments

* 🔄 **Automated Data Pipeline**

  * Data fetching
  * Data validation
  * Database ingestion
  * Feature generation
  * Prediction pipeline

* 🗄️ **PostgreSQL Database**

  * Structured storage for exchange-rate and oil-price data
  * Separate database layer for connections and table creation

* 📈 **Interactive Dashboard**

  * React + Vite frontend
  * Currency analytics
  * Market indicators
  * Prediction results
  * Visual data exploration

* ⚙️ **API Layer**

  * Python backend
  * FastAPI-based API endpoints
  * Analytics and prediction integration

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      RBI Data        │
                    │  Reference Rates     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Data Ingestion     │
                    │   & Validation       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      PostgreSQL      │
                    │       Database       │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
      ┌────────────────────┐      ┌────────────────────┐
      │ Feature Engineering│      │   WTI Oil Prices   │
      │ & Analytics        │      │      Dataset       │
      └─────────┬──────────┘      └─────────┬──────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                   ┌─────────────────────┐
                   │ Machine Learning    │
                   │ USD/INR Prediction  │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │     FastAPI API     │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   React Dashboard   │
                   │       + Vite        │
                   └─────────────────────┘
```

---

## 📁 Project Structure

```text
InsightIQ-AI/
│
├── analytics/
│   └── rbi_analytics.py
│
├── api/
│   └── main.py
│
├── config/
│   └── settings.py
│
├── dashboard/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── data/
│   ├── download_oil.py
│   ├── oil_prices.csv
│   └── raw/
│
├── database/
│   ├── connection.py
│   ├── create_tables.py
│   ├── test_connection.py
│   └── __init__.py
│
├── ingestion/
│   ├── rbi_fetcher.py
│   ├── rbi_ingestion.py
│   ├── oil_ingestion.py
│   └── __init__.py
│
├── pipeline/
│   ├── daily_update.py
│   └── __init__.py
│
├── prediction/
│   ├── feature_builder.py
│   └── predict.py
│
├── requirements.txt
├── package.json
├── package-lock.json
├── check_tables.py
├── test_setup.py
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

### Backend & Data

* Python
* Pandas
* NumPy
* Scikit-learn
* PostgreSQL
* FastAPI
* SQL

### Frontend

* React.js
* Vite
* JavaScript
* CSS

### Analytics & Machine Learning

* Exploratory Data Analysis
* Time-series feature engineering
* Moving averages
* Percentage returns
* Volatility features
* Random Forest
* Regression
* Classification

### Data Sources

* Reserve Bank of India reference-rate data
* WTI crude-oil price data

---

## 📊 Data Pipeline

InsightIQ AI follows a structured data pipeline:

### 1. Data Acquisition

Historical RBI reference-rate data is collected and processed.

WTI crude-oil price data is also incorporated as an external market indicator.

### 2. Data Validation

The pipeline checks for:

* Missing values
* Duplicate dates
* Data consistency
* Date ranges
* Required columns

### 3. Database Ingestion

Validated data is stored in PostgreSQL for structured querying and downstream analytics.

### 4. Feature Engineering

The project generates features such as:

```text
USD/INR
GBP/INR
EUR/INR
JPY/INR
AED/INR
IDR/INR
Daily Percentage Change
7-Day Moving Average
30-Day Moving Average
Volatility
WTI Oil Price
```

### 5. Machine Learning

The engineered dataset is used to experiment with:

* USD/INR rate prediction
* Return prediction
* Direction classification
* Baseline vs ML model performance

### 6. API & Dashboard

The processed analytics and predictions are exposed through the backend API and presented through the React dashboard.

---

## 🤖 Machine Learning

The project evaluates machine-learning models against simple baseline approaches.

One of the primary experiments uses **Random Forest** for USD/INR prediction.

The project also explores predicting the **direction of currency movement** as a classification problem.

### Evaluation Metrics

Regression models are evaluated using:

* Mean Absolute Error (MAE)
* Root Mean Squared Error (RMSE)

Classification experiments use:

* Accuracy
* Precision
* Recall
* F1-score
* Confusion Matrix

---

## 📈 Analytics

The analytics layer provides insights into currency movements through:

* Daily returns
* Moving averages
* Rolling volatility
* Currency comparisons
* Market-indicator relationships
* Historical trends
* Prediction performance

The objective is not simply to generate a prediction, but to provide a broader **business-intelligence view of currency movements**.

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Soumyasatapathy1819/InsightIQ-AI.git
cd InsightIQ-AI
```

### 2. Create a Python virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root.

Example:

```env
DATABASE_URL=your_postgresql_connection_string
```

Do not commit the `.env` file to GitHub.

### 5. Configure PostgreSQL

Make sure PostgreSQL is running and create the required database.

Then run:

```bash
python database/create_tables.py
```

### 6. Test the database connection

```bash
python database/test_connection.py
```

### 7. Run data ingestion

Run the appropriate ingestion scripts:

```bash
python ingestion/rbi_ingestion.py
```

and:

```bash
python ingestion/oil_ingestion.py
```

### 8. Run analytics

```bash
python analytics/rbi_analytics.py
```

### 9. Run the prediction pipeline

```bash
python prediction/feature_builder.py
```

```bash
python prediction/predict.py
```

### 10. Start the API

```bash
uvicorn api.main:app --reload
```

The API will normally be available at:

```text
http://127.0.0.1:8000
```

### 11. Start the dashboard

Open another terminal:

```bash
cd dashboard
npm install
npm run dev
```

The Vite development server will provide the local dashboard URL in the terminal.

---

## 🔄 Daily Update Pipeline

The project includes a daily update pipeline designed to refresh the analytics workflow.

Run:

```bash
python pipeline/daily_update.py
```

The pipeline is intended to coordinate the latest available data with downstream processing and prediction.

---

## 🔐 Security

Sensitive configuration should be stored in environment variables.

The following files and directories are intentionally excluded from Git:

```text
.venv/
.env
__pycache__/
data/raw/
data/processed/
models/*.pkl
models/*.joblib
.vscode/
*.log
```

This prevents local environments, credentials, generated datasets, and model artifacts from being accidentally committed.

---

## 🎯 Project Goals

InsightIQ AI was designed to demonstrate how a modern analytics system can combine:

```text
Data Engineering
        ↓
Data Analytics
        ↓
Statistical Feature Engineering
        ↓
Machine Learning
        ↓
API Development
        ↓
Interactive Visualization
```

The project focuses on building an end-to-end workflow rather than treating machine learning as an isolated model.

---

## 🔮 Future Improvements

Potential future improvements include:

* Automated scheduled data ingestion
* More external economic indicators
* Additional forecasting models
* XGBoost and Gradient Boosting comparison
* Advanced time-series models
* Model monitoring
* Automated model retraining
* Prediction confidence intervals
* Advanced dashboard filtering
* Real-time market alerts
* Deployment using Docker
* Cloud database deployment
* CI/CD automation
* Automated data-quality monitoring

---

## 👨‍💻 Author

**Soumya Prakash Satapathy**

B.Tech (Hons.) Computer Science & Engineering
XIM University, Bhubaneswar

### Areas of Interest

* Data Analytics
* Data Science
* Artificial Intelligence & Machine Learning
* Business Intelligence
* Full-Stack Development
* Data Engineering

---

## ⭐ Project

If you find this project useful or interesting, consider giving the repository a star.

**GitHub:**
https://github.com/Soumyasatapathy1819/InsightIQ-AI
