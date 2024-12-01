# ElectronML

_More machine learning in software!_

ElectronML is a desktop application to train XGBoost models and seamlessly export them for TypeScript/JavaScript inference.

You can download the resulting JSON inference package and use it directly in your apps with [ml-toolkit-ts](https://github.com/antoinebcx/ml-toolkit-ts)!

<img width="1192" alt="image" src="https://github.com/user-attachments/assets/2e3e6f9a-d162-4321-9e45-1c4a3b3f6143">
<img width="1192" alt="image" src="https://github.com/user-attachments/assets/800f2af7-3235-466d-a5e4-247a35f48543">


## Features

- Train XGBoost models with a simple interface
- Support for classification and regression tasks
- Automatic creation of data preprocessing pipeline
- Export your model and pipeline as a ready-to-use inference package (JSON)
- Direct integration with [ml-toolkit-ts](https://github.com/antoinebcx/ml-toolkit-ts) for inference in TypeScript/JavaScript

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
