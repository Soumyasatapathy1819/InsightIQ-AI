# InsightIQ AI

> **AI-Powered Business Intelligence & Customer Analytics Platform for USD/INR Forecasting**

InsightIQ AI is an end-to-end data analytics and machine learning platform designed to analyze and forecast **USD/INR exchange rates** using historical **RBI reference-rate data** and external market signals such as **WTI crude oil prices**.

The platform combines automated data ingestion, PostgreSQL data storage, feature engineering, statistical analysis, machine learning, REST APIs, and an interactive React dashboard into a single analytics pipeline.

---

## 🚀 Project Overview

InsightIQ AI transforms raw financial data into actionable insights through an automated analytics workflow.

### Core workflow

```text
RBI Reference Rates
        │
        ▼
Data Ingestion
        │
        ▼
Data Validation & Cleaning
        │
        ▼
PostgreSQL Database
        │
        ▼
Feature Engineering
        │
        ├── Moving Averages
        ├── Daily Returns
        ├── Volatility
        └── Market Indicators
        │
        ▼
Machine Learning
        │
        ├── Baseline Model
        ├── Return Prediction
        └── Direction Classification
        │
        ▼
FastAPI Backend
        │
        ▼
React Dashboard
        │
        ▼
Interactive Analytics & Forecasting
```

---

## ✨ Key Features

* 📊 Historical USD/INR exchange-rate analysis
* 🏦 RBI reference-rate data ingestion
* 🛢️ WTI crude oil price integration
* 🧹 Automated data cleaning and validation
* 🗄️ PostgreSQL database integration
* 📈 Moving averages and volatility analysis
* 📉 Daily percentage-return calculation
* 🤖 Machine learning-based USD/INR prediction
* 🔮 Currency movement direction classification
* ⚡ FastAPI REST backend
* ⚛️ React + Vite analytics dashboard
* 🔄 Daily data-update pipeline
* 📊 Interactive financial analytics
* 🧪 Database and pipeline testing

---

## 🧠 Machine Learning

InsightIQ AI experiments with machine learning models to predict future USD/INR movements.

### Prediction approaches

#### 1. Baseline Model

A naive baseline is used as a benchmark for evaluating whether the machine learning models provide meaningful predictive improvement.

#### 2. USD/INR Return Model

The model uses engineered historical features such as:

* USD/INR exchange rate
* Daily percentage returns
* 7-day moving average
* 30-day moving average
* Historical volatility
* Lag-based features

#### 3. Direction Classification

A classification model attempts to predict whether the USD/INR rate will:

```text
↑ Increase
↓ Decrease
```

This provides an additional perspective beyond numerical price prediction.

---

## 📊 Data Sources

### RBI Reference Rates

Historical exchange-rate data is obtained from the **Reserve Bank of India (RBI)** reference-rate dataset.

The dataset contains exchange rates for currencies including:

* USD
* GBP
* EUR
* JPY
* AED
* IDR

### WTI Crude Oil

The project also incorporates historical **WTI crude oil prices** as an external market indicator.

This allows the system to investigate whether crude-oil movements provide useful information for currency-rate analysis.

---

## 🏗️ Project Architecture

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
│   ├── package.json
│   └── vite.config.js
│
├── data/
│   └── download_oil.py
│
├── database/
│   ├── connection.py
│   ├── create_tables.py
│   └── test_connection.py
│
├── ingestion/
│   ├── oil_ingestion.py
│   ├── rbi_fetcher.py
│   └── rbi_ingestion.py
│
├── pipeline/
│   └── daily_update.py
│
├── prediction/
│   ├── feature_builder.py
│   └── predict.py
│
├── requirements.txt
├── package.json
├── package-lock.json
├── check_tables.py
└── test_setup.py
```

---

## 🛠️ Technology Stack

### Backend & Data

* Python
* Pandas
* NumPy
* Scikit-learn
* PostgreSQL
* FastAPI

### Frontend

* React.js
* Vite
* JavaScript
* CSS

### Analytics & Machine Learning

* Statistical analysis
* Feature engineering
* Time-series features
* Random Forest
* Classification
* Model evaluation

### Development Tools

* Git
* GitHub
* VS Code
* Python Virtual Environment
* npm

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Soumyasatapathy1819/InsightIQ-AI.git
cd InsightIQ-AI
```

### 2. Create a Python virtual environment

```bash
python -m venv .venv
```

### 3. Activate the virtual environment

#### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### 4. Install Python dependencies

```bash
pip install -r requirements.txt
```

---

## 🗄️ Database Setup

InsightIQ AI uses PostgreSQL for persistent storage.

Create a PostgreSQL database and configure the required environment variables in a `.env` file.

Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insightiq
DB_USER=postgres
DB_PASSWORD=your_password
```

> Do not commit your `.env` file to GitHub.

---

## 📥 Data Ingestion

The ingestion layer retrieves and processes financial datasets before storing them in PostgreSQL.

### RBI data

```bash
python ingestion/rbi_ingestion.py
```

### Oil data

```bash
python ingestion/oil_ingestion.py
```

---

## 📊 Run Analytics

To generate analytics and engineered financial features:

```bash
python analytics/rbi_analytics.py
```

The analytics layer calculates indicators such as:

* Daily returns
* Moving averages
* Volatility
* Lag features
* Exchange-rate statistics

---

## 🤖 Run Prediction

The prediction module can be executed using:

```bash
python prediction/predict.py
```

Feature construction is handled through:

```bash
python prediction/feature_builder.py
```

---

## 🔄 Daily Update Pipeline

InsightIQ AI includes a pipeline designed to automate the data-update process.

Run:

```bash
python pipeline/daily_update.py
```

The pipeline is intended to:

1. Fetch updated financial data
2. Validate incoming data
3. Update the database
4. Generate analytical features
5. Prepare data for prediction
6. Refresh the analytics layer

---

## ⚡ Start the FastAPI Backend

Run the API using:

```bash
uvicorn api.main:app --reload
```

The backend provides the API layer required by the dashboard.

---

## 💻 Start the React Dashboard

Open another terminal:

```bash
cd dashboard
```

Install frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The dashboard will then be available through the local Vite development server.

---

## 🧪 Testing

Basic project setup can be tested using:

```bash
python test_setup.py
```

Database connectivity can be tested using:

```bash
python database/test_connection.py
```

Database tables can be inspected using:

```bash
python check_tables.py
```

---

## 📈 Analytics Capabilities

The platform provides several analytical perspectives on USD/INR behavior.

### Trend Analysis

Historical exchange-rate trends can be analyzed across different time periods.

### Moving Averages

Short-term and long-term moving averages help identify underlying trends.

### Volatility

Historical volatility is calculated to understand periods of increased currency movement.

### Return Analysis

Daily percentage returns are used as machine-learning features and for market-movement analysis.

### External Market Signals

WTI crude oil prices are incorporated as an external feature to investigate relationships between commodity prices and currency movements.

---

## 🎯 Project Goals

The primary objectives of InsightIQ AI are to:

* Build a complete end-to-end analytics pipeline
* Automate financial-data ingestion
* Store structured market data in PostgreSQL
* Apply data analytics and feature engineering
* Experiment with machine learning for currency forecasting
* Expose analytical results through APIs
* Present insights through an interactive dashboard

---

## 🔮 Future Enhancements

Potential future improvements include:

* Real-time financial data integration
* Automated model retraining
* Advanced time-series forecasting models
* XGBoost/LightGBM model comparison
* LSTM/Transformer-based forecasting
* Automated model performance monitoring
* SHAP-based model explainability
* More macroeconomic indicators
* Automated anomaly detection
* Cloud deployment
* CI/CD pipeline
* Scheduled daily production updates
* Advanced financial alerts and notifications

---

## 🔐 Security & Data Handling

Sensitive configuration values such as database credentials and API keys are stored through environment variables.

The repository excludes:

```text
.env
.venv/
__pycache__/
data/raw/
data/processed/
models/*.pkl
models/*.joblib
```

These files should not be committed to the public repository.

---

## 👨‍💻 Author

**Soumya Prakash Satapathy**

B.Tech (Hons.) Computer Science & Engineering
XIM University, Bhubaneswar

GitHub: [Soumyasatapathy1819](https://github.com/Soumyasatapathy1819)

---

## ⭐ Project

**InsightIQ AI — AI-Powered Business Intelligence & Currency Analytics Platform**

Built with Python, PostgreSQL, FastAPI, React, and Machine Learning.
