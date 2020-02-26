const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const {basename, join} = path;

class FileWriter {
    write = (dataObject, filePath, tempDirPath) => {
        const data = JSON.stringify(dataObject, null, 4);
        const tempArchiveFile = this._getTempFile(filePath, tempDirPath);
        fs.writeFileSync(tempArchiveFile, data, 'utf8');
        fs.renameSync(tempArchiveFile, filePath);
    };

    _getRandomHexString(length = 8) {
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
    }

    _getTempFile(filePath, tempDirPath) {
        const randomString = this._getRandomHexString();
        const tempFilename = basename(filePath).split('.').join(`.TEMP-${randomString}.`);
        return join(tempDirPath, tempFilename);
    }
}

module.exports = new FileWriter();
