import express from "express";
import cors from "cors";
import multer from "multer";
import {v4 as uuidv4} from "uuid";
import path from "path";
import fs from "fs";
import {exec} from "child_process";
import { stderr, stdout } from "process";

const app = express();

const storage = multer.diskStorage({
   destination: function(req, file, cb){
      cb(null, "./uploads");
   },
   filename: function(req, file, cb){
      cb(null, file.fieldname + '-' +uuidv4() + path.extname(file.originalname))
   }
});

const upload = multer({storage: storage});


app.use(cors({
   origin:["http://localhost:3000",
   "http://localhost:5173"],
   credentials: true,
}));

app.use((req, res, next) => {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
})

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/uploads", express.static("uploads"));


app.get('/', (req, res)=>{
   res.json({message: "ok"});
});

app.post('/upload', upload.single('file'), function(req, res){
   const lessonid = uuidv4();
   const videopath = req.file.path;
   const outputpath = `./uploads/courses/${lessonid}`
   const hlspath = `${outputpath}/index.m3u8`

   if(!fs.existsSync(outputpath)) {
      fs.mkdirSync(outputpath, {recursive: true});
   }

   const ffmpegCommand = `ffmpeg -i ${videopath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputpath}/segment%03d.ts" -start_number 0 ${hlspath}`

   exec(ffmpegCommand,(error, stdout, stderr)=>{
      if(error){
         console.log("exec error", error);
      }

      console.log(`stdout: ${stdout}, stderr: ${stderr}`);

      const videourl = `http://localhost:8000/uploads/courses/${lessonid}/index.m3u8`;

      res.json({
         message: "Video converted to HLS format",
         videoUrl: videourl,
         lessonId: lessonid
       })
   })
});

app.listen(8000, ()=>{
	console.log("Server listening at port 8000");
});
