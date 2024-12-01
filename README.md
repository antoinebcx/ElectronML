# ElectronML

A desktop application to train XGBoost models and seamlessly export them for TypeScript/JavaScript inference.

## Features

- Train XGBoost models with a simple interface
- Support for classification and regression tasks
- Automatic creation of data preprocessing pipeline
- Export your model and pipeline as a ready-to-use inference package (JSON)
- Direct integration with [ml-toolkit-ts](https://github.com/antoinebcx/ml-toolkit-ts) for TypeScript/JavaScript inference

No need to rely on an external Python service anymore to use XGBoost in TypeScript/JavaScript environments!

## Usage

### Prerequesites
You need **Python 3** and **Node.js**.

### Setup and launch Python server
Run the following commands at /backend folder level:
```shell
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Setup and launch Electron app
Run the following commands at the root folder level:
```shell
npm install
npm start
```
