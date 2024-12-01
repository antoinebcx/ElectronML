# ElectronML

_More machine learning in software applications!_

ElectronML is a desktop app to train XGBoost models and seamlessly export them for TypeScript/JavaScript inference.

You can download the resulting JSON inference package and use it directly in your apps with [ml-toolkit-ts](https://github.com/antoinebcx/ml-toolkit-ts).

<img width="1192" alt="image" src="https://github.com/user-attachments/assets/2e3e6f9a-d162-4321-9e45-1c4a3b3f6143">
<img width="1192" alt="image" src="https://github.com/user-attachments/assets/800f2af7-3235-466d-a5e4-247a35f48543">


## Features

- Train XGBoost models with a simple interface
- Support for classification and regression tasks
- Automatic creation of data preprocessing pipeline
- Export your model and pipeline as a ready-to-use inference package (JSON)
- Direct integration with [ml-toolkit-ts](https://github.com/antoinebcx/ml-toolkit-ts) for inference in TypeScript/JavaScript

No need to rely on an external Python service anymore to use XGBoost in TypeScript/JavaScript environments!

## Download & Installation

Download the app from the [Releases](https://github.com/antoinebcx/ElectronML/releases/tag/v1.0.1) page:
- Mac: `Electron ML-1.0.1.dmg`
- Windows: `Electron ML Setup 1.0.1.exe`
- Linux: `Electron ML-1.0.1.AppImage`

Then, to install it:
- Mac: Double-click the .dmg file and drag the app to Applications
- Windows: Run the setup executable
- Linux: Make the AppImage executable (`chmod +x`) and run it

## Development

### Prerequesites
You need **Python 3** and **Node.js**.

### Setup and Launch
1. Clone the repository
```bash
git clone https://github.com/antoinebcx/ElectronML.git
cd ElectronML
```

2. Setup and launch Python server
```shell
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

3. Setup and launch Electron app
```shell
cd ..      # Back to root directory
npm install
npm start
```

### Building from source
```shell
npm run build      # Build the application
npm run package:mac    # Package for macOS
npm run package:win    # Package for Windows
npm run package:linux  # Package for Linux
```
