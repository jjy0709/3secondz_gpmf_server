var AWS = require('aws-sdk');
const fs = require('fs');
var express = require('express');
const { resolve } = require('path');
const { rejects } = require('assert');
const child_process = require('child_process');

var app = express();
app.use(express.json());
const port = 4000;

var server = app.listen(port, function(){
    console.log("test server on port 4000");
});

app.post('/test', function(req,res){
    var bucket = req.body.Bucket;
	var key = req.body.Key;
	var user_id =req.body.user_id;
	var date = req.body.date;
	var mp4Name = req.body.mp4_name;
    var parserfileName = mp4Name.replace(".mp4", ".json")
	var resultfileName = mp4Name.replace("gpmf.mp4", "result.json")
    var resultName = req.body.result;
    resultName = resultName.replace("result_filename", resultfileName);
    console.log(key);
    res.end(JSON.stringify({result:1}));
    let file = fs.createWriteStream(mp4Name);

    s3 = new AWS.S3({apiVersion: '2006-03-01'});
    var downloadParams = {Bucket: bucket, Key: key};

    s3.getObject(downloadParams).createReadStream()
    .on('end', () => {
        return resolve();
    })
    .on('error', (err) => {
        return rejects(err);
    }).pipe(file)
    .on('close', () => {
        const child1 = child_process.execFile("./gpmf-parser", [mp4Name, parserfileName], (err, stdin, stdout) => {
            if(err) throw err;
        })
        const child2 = child_process.execFile("python3", ['./main.py', mp4Name], {maxBuffer:300*1024*1024}, (err, stdin, stdout) => {
            if(err) throw err;
            // const store_params = ['./store.py', jsonName, user_id, date, resultName, key]
            // const child3 = child_process.execFile('python3', store_params, (err, stdin, stdout)=>{
                // if(err) throw err;
            var result = fs.readFile(resultfileName, (err, data)=>{
                // var result = JSON.parse(data);
                var uploadParams = {Bucket:"s3-gpmf-test-bucket112905-dev-dest", Key:resultName, Body:data}
                // var uploadoptions = {partSize: 100 * 1024 * 1024, queueSize: 1};
                s3.putObject(uploadParams, function(err, data){
                    if(err) throw err;
                    // res.end(JSON.stringify({result:1}));
                    const child4 = child_process.execFile('rm', [mp4Name, parserfileName, resultfileName], (err, stdin, stdout)=>{
                        if (err) throw err;
                        console.log("Done!");
                    });
                })
            })
        });
    });
});
