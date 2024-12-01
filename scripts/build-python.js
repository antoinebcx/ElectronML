const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function detectArchitecture() {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'darwin') {
      return resolve('other');
    }
    
    exec('uname -m', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim()); // arm64 for Apple Silicon, x86_64 for Intel
    });
  });
}

async function buildPythonBackend() {
  try {
    const arch = await detectArchitecture();
    const isMac = os.platform() === 'darwin';
    const isWindows = os.platform() === 'win32';
    
    // configure Python command based on architecture
    const pythonCommand = isMac && arch === 'arm64' ? 'arch -arm64 python3' : 'python3';

    // ensure backend-dist directory exists
    const distPath = path.join(__dirname, '../backend-dist');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath);
    }

    const activateCommand = isWindows ? '.\\venv\\Scripts\\activate' : 'source venv/bin/activate';
    const removeVenvCommand = isWindows ? 'if exist venv rmdir /s /q venv' : 'rm -rf venv';

    const commands = [
      removeVenvCommand,
      `${pythonCommand} -m venv venv`,
      activateCommand,
      'pip install --upgrade pip',
      'pip install -r requirements.txt',
      'pip install pyinstaller',
      `pyinstaller --noconsole --onefile --distpath ../backend-dist --name backend${isWindows ? '.exe' : ''} --collect-all pydantic --collect-all xgboost --hidden-import="xgboost" main.py`
    ];

    const command = commands.join(isWindows ? ' && ' : ' && ');
    
    return new Promise((resolve, reject) => {
      exec(command, { 
        cwd: path.join(__dirname, '../backend'),
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '../backend')
        }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error building Python backend: ${error}`);
          console.error('stdout:', stdout);
          console.error('stderr:', stderr);
          reject(error);
          return;
        }
        console.log(`Successfully built Python backend for ${arch || os.platform()}`);
        console.log(stdout);
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to build Python backend:', error);
    throw error;
  }
}

buildPythonBackend().catch(console.error);