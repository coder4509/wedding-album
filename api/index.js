import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import { google } from "googleapis";
import sharp from "sharp";
import cors from "cors";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
];
// eslint-disable-next-line no-undef
const KEY_PATH = path.join(process.cwd(), "server", "auth.json");
const keys = fs.readFileSync(KEY_PATH, "utf8") || {};
const keysData = JSON.parse(keys);
const jwt = new google.auth.JWT(
  keysData.client_email,
  null,
  keysData.private_key,
  SCOPES
);

const drive = google.drive({ version: "v3", auth: jwt });

const authJWT = (req, res, next) => {
  //   check token expired
  jwt.authorize((err, response) => {
    if (err) {
      return res.send("Access Denied");
    }
    const { access_token } = response;
    req.driveToken = access_token;
    next();
  });
};

// eslint-disable-next-line no-undef
const { SERVER_PORT } = process.env;
const app = express();
app.use(
  cors({
    origin: "http://127.0.0.1:3002",
    methods: "GET",
  })
);
app.use(bodyParser.urlencoded({ extended: false }));

const getWedImagesList = (res) => {
  drive.files.list(
    {
      q: "mimeType != 'application/vnd.google-apps.folder'",
    },
    async function (err, response) {
      if (err) {
        console.log("The API returned an error: " + err);
        return;
      }
      let files = response.data.files;
      if (files.length == 0) {
        console.log("No files found.");
      } else {
        let formattedData = [];
        if (fs.existsSync("allData.json")) {
          console.time();
          const currentData = fs.readFileSync("allData.json", 'utf8') || [];
          formattedData = JSON.parse(currentData);
          const newIds = files.map((newFile) => newFile.id);
          const existingIds = formattedData.map((existFile) => existFile.fileId);
          const newId = newIds.find((id) => !existingIds.includes(id));
          if (newId) {
            console.log(newId);
            files = files.filter((fIndex)=>fIndex.id === newId);
          } else {
            console.timeEnd();
            return res.send({data: formattedData, code: 200, message: 'success'})
          }
        }
        console.time();
        const result = files
          .filter((j) => j.mimeType.includes("image"))
          .map((file) => {
            return { fileId: file.id, data: "", mimeType: file.mimeType };
          });
        const finalRes = await Promise.all(
          result.map(async (fileItem) => {
            const { fileId, mimeType } = fileItem;
            const {originImg, posterImg} = await getImgContent(fileId, mimeType);
            fileItem.data = originImg;
            fileItem.posterImg = posterImg
            return fileItem;
          })
        );
        const dataZip = JSON.stringify(formattedData.concat(finalRes));
        fs.writeFile(
          "allData.json",
          dataZip,
          { encoding: "utf8" },
          () => {
            if (err) {
              return res.send({
                code: 500,
                data: "",
                message: "WriteFile::Internal Server Error",
              });
            }
            fs.readFile("allData.json", { encoding: "utf8" }, (rerr, data) => {
              if (rerr) {
                return res.send({
                  code: 500,
                  data: "",
                  message: "ReadFile::Internal Server Error",
                });
              }
              const finalData = JSON.parse(data);
              console.timeEnd();
              res.send({data: finalData, code: 200, message: 'success'});
            });
          }
        );
      }
    }
  );
};

const getImgContent = (fileId, mimeType) => {
  return new Promise((resolve) => {
    drive.files.get(
      {
        fileId,
        alt: "media",
      },
      { responseType: "stream" },
      function (err, { data }) {
        if (err) {
          resolve("");
        }
        const buf = [];
        data.on("data", (e) => buf.push(e));
        data.on("end", () => {
          const buffer = Buffer.concat(buf);
          sharp(buffer).rotate().resize(3840, 2160).jpeg({ mozjpeg: true}).toBuffer()
          .then( dataL => {
            sharp(dataL).resize(250, 150).jpeg({ mozjpeg: true}).toBuffer().then((posterData)=>{
              const base64Data = Buffer.from(dataL).toString('base64');
              const posetrData = Buffer.from(posterData).toString('base64');
              const imgData = `data:${mimeType};base64,${base64Data}`;
              const posterImg = `data:${mimeType};base64,${posetrData}`;
              resolve({originImg: imgData, posterImg: posterImg});
            })
           })
          .catch( err => { console.log(err) });
        });
      }
    );
  });
};

app.get("/api/list-img", authJWT, (req, res) => {
  res.setHeader("Content-Type", "application/json");
  getWedImagesList(res);
});

app.listen(SERVER_PORT, () => {
  console.log(`Express server is running on localhost:${SERVER_PORT}`);
});
