const colors = require('colors');
const fs = require('fs');
const path = require('path');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

const PNG = require('pngjs').PNG;
const pixelmatch = require('./pixelmatch');

/**
 * Create folder if it does not exist.
 * @param {string} pathToFolder 
 */
function createFolder(pathToFolder) {
  if (!fs.existsSync(pathToFolder)) {
    fs.mkdirSync(pathToFolder);
  }
}


/**
 * Create a visual testing report.
 * @param {string} rootFolder path where we store screenshots. 
 */
function VisualTestingReport(rootFolder) {
  const errors = [];
  
  const goldFolder = path.join(rootFolder, 'gold');
  const currentFolder = path.join(rootFolder, 'current');
  const diffFolder = path.join(rootFolder, 'diff');
  
  createFolder(rootFolder);
  createFolder(goldFolder);
  createFolder(currentFolder);
  createFolder(diffFolder);

  const ids = [];

  /**
   * Add the screenshot with given id to the report.
   * @param {string} id the screenshot id 
   * @param {string} png64 the base64 encoded PNG
   * @param { (x: number, y: number) => boolean } ignorePixel ignore pixel function
   */
  const add = async (id, png64, ignorePixel) => {
    if (ids.indexOf(id) > -1) {
      throw new Error('This id has already been used: "' + id + '"');
    }
    fs.writeFileSync(
      path.join(currentFolder, id + '.png'),
      png64, {
        encoding: 'base64'
      }
    );
    ids.push(id);
    await checkDiff(id, ignorePixel);
  }

  /**
   * Check the diff with Gold standard.
   * @param {string} id the screenshot id 
   * @param { (x: number, y: number) => boolean } ignorePixel ignore pixel function
   */
  const checkDiff = (id, ignorePixel) => {
    return new Promise(resolve => {
      if (!fs.existsSync(path.join(goldFolder, id + '.png'))) {
        console.log(
          // tslint:disable-next-line
          ('New standard defined "' + id + '" file://' + path.join(currentFolder, id + '.png')).warn
        );
        return resolve(true);
      }

      const doneReading = () => {
        if (++filesRead < 2) {
          return;
        }
        const diff = new PNG({ width: img1.width, height: img1.height });

        const nDiff = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0, ignorePixel: ignorePixel });

        fs.writeFileSync(path.join(diffFolder, id + '.png'), PNG.sync.write(diff));
        if (nDiff > 0) {
          addError(id);
          console.log(
            // tslint:disable-next-line
            `Deviation from GOLD file://${path.join(diffFolder, id + '.png')}`.error
          );
        }
        resolve(nDiff === 0);
      };

      const img1 = fs.createReadStream(path.join(goldFolder, id + '.png'))
        .pipe(new PNG()).on('parsed', doneReading);
      const img2 = fs.createReadStream(path.join(currentFolder, id + '.png'))
        .pipe(new PNG()).on('parsed', doneReading);
      let filesRead = 0;

    });
  }

  /**
   * Add an error.
   * @param {string} id the screenshot id 
   */
  const addError = (id) => {
    errors.push(id);
  }

  return {
    testIfError: () => {
      expect(errors.length).toBe(0);
    },
    add: add
  };

}

module.exports = VisualTestingReport;
