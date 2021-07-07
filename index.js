var AWS = require('aws-sdk');
const fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
const { resolve } = require('path');
const { rejects } = require('assert');
const child_process = require('child_process');
s3 = new AWS.S3({apiVersion: '2006-03-01'});

var app = express();
app.use(express.json());
app.use(express.urlencoded({extended:false}));
const port = 4000;

var server = app.listen(port, function(){
    console.log("test server on port 4000");
});

app.get('/', function(req, res){
    res.sendFile('home.html', {root: __dirname});
});

app.get('/id', function(req,res){
    req.setTimeout(60*4*1000)
    var id = req.query.id;
    var downloadParams = {Bucket:'s3-gpmf-test-bucket112905-dev', Key:id}
    var mp4name = id.slice(id.lastIndexOf('/')+1);
    // res.send("wait...");
    let file = fs.createWriteStream(mp4name);
    s3.getObject(downloadParams).createReadStream()
    .on('end',()=>{
        return resolve();
    })
    .on('error', (err)=>{
        return rejects(err);
    }).pipe(file)
    .on('close', () =>{
        const child1 = child_process.execFile("python3", ['./main.py', mp4name], {maxBuffer:300*1024*1024}, function(err,stdout,stderr){
            var resultfileName = mp4name.replace("gpmf.mp4", "result.json");
            // res.redirect(`localhost:4000/data/?id=${resultfileName}`);
            res.setHeader('Content-Disposition', `attachment; filename=${resultfileName}`);
            fs.createReadStream(resultfileName).pipe(res)
            var jsonfilename = mp4name.replace("mp4", "json");
            const child = child_process.execFile("rm", [mp4name, resultfileName, jsonfilename], function(err,stdout,stderr){
                if(err) throw err;
                console.log("Done");
            })
        })
    })
})

app.post('/id', function(req,res){
    var id = req.body.id;
    var params = {
        Bucket: 's3-gpmf-test-bucket112905-dev',
        Prefix: 'public/' + id
    };
    s3.listObjectsV2(params, function(err, data){
        if(err) throw err;
        var list = `<ul>`;
        var content = data.Contents;
        var i = 0;
        while(i < data.KeyCount){
            if(content[i].Key.search("gpmf") != -1){
                list = list + `<li><a href="/id/?id=${content[i].Key}">${content[i].Key}</a></li>`;
            }
            i = i+1;
        }
        list = list + `</ul>`;
        var template = `
        <!doctype html>
        <html>
            <head>MP4 list</head>
            <body>
                ${list}
            </body>
        </html>
        <style>
            li{ margin: 20px; }
        </style>
        `;
        res.end(template);
    })
})