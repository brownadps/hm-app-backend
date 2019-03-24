'use strict';

const Multer = require('multer');
const path = require('path');

const Storage = Multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.HM_FILE_UPLOAD_PATH);
    },
    filename: function (req, file, cb) {
        const date = new Date();
        const month = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
        const suffix = "" + Math.floor(Math.random() * 100000);
        const extension = path.extname(file.originalname);
        cb(null, month + "-" + Date.now() + "-" + suffix + extension);
    }
  })
   
const Upload = Multer({ storage: Storage });

module.exports = {
    Upload
}