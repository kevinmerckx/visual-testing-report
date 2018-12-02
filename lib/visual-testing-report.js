import colors from 'colors';
import fs from 'fs';
import path from 'path';

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
const pixelmatch = require('pixelmatch');

/**
 * Create folder if it does not exist.
 * @param {string} pathToFolder 
 */
function createFolder(pathToFolder) {
  if (!fs.existsSync(pathToFolder)) {
    fs.mkdirSync(pathToFolder);
  }
}

class VisualTestingReport {
  errors = [];
  rootFolder;

  /**
   * Constructor.
   * @param {string} rootFolder path where we store screenshots. 
   */
  constructor(rootFolder) {
    this.rootFolder = rootFolder;
    this.prepare();
  }

  testIfError() {
    expect(this.errors.length).toBe(0);
  }

  /**
   * 
   * @param {string} id the screenshot id 
   * @param {*} png64 the base64 encoded PNG
   */
  async add(id, png64) {
    fs.writeFileSync(
      path.join(__dirname, '../visuals/current', id + '.png'),
      png64, {
        encoding: 'base64'
      }
    );
    await this.checkDiff(id);
  }

  /**
   * Check the diff with Gold standard.
   * @param {string} id the screenshot id 
   */
  checkDiff(id) {
    return new Promise(resolve => {
      if (!fs.existsSync(path.join(this.goldFolder, id + '.png'))) {
        console.log(
          // tslint:disable-next-line
          ('New standard defined "' + id + '" file://' + path.join(this.currentFolder, id + '.png')).warn
        );
        return resolve(true);
      }

      const doneReading = () => {
        if (++filesRead < 2) {
          return;
        }
        const diff = new PNG({ width: img1.width, height: img1.height });

        const nDiff = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0 });

        diff.pack().pipe(fs.createWriteStream(path.join(this.diffFolder, id + '.png'))).on('close', () => {
          if (nDiff > 0) {
            this.addError(id);
            console.log(
              // tslint:disable-next-line
              `Deviation from GOLD file://${path.join(this.diffFolder, id + '.png')}`.error
            );
          }
          resolve(nDiff === 0);
        });
      };

      const img1 = fs.createReadStream(path.join(this.goldFolder, id + '.png'))
        .pipe(new PNG()).on('parsed', doneReading);
      const img2 = fs.createReadStream(path.join(this.currentFolder, id + '.png'))
        .pipe(new PNG()).on('parsed', doneReading);
      let filesRead = 0;

    });
  }

  /**
   * Add an error.
   * @param {string} id the screenshot id 
   */
  addError(id) {
    this.errors.push(id);
  }

  get goldFolder() {
    return path.join(this.rootFolder, 'gold');
  }

  get currentFolder() {
    return path.join(this.rootFolder, 'current');
  }

  get diffFolder() {
    return path.join(this.rootFolder, 'diff');
  }

  prepare() {
    createFolder(this.rootFolder);
    createFolder(this.goldFolder);
    createFolder(this.currentFolder);
    createFolder(this.diffFolder);
  }
}

module.exports = VisualTestingReport;
