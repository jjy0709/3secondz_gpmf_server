var AWS = require('aws-sdk');
const fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
const { resolve } = require('path');
const { rejects } = require('assert');
var history = require('history');
const child_process = require('child_process');
s3 = new AWS.S3({apiVersion: '2006-03-01'});

var app = express();
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(express.static(__dirname))
app.use(express.static(__dirname + 'loading'));
const port = 4000;

var server = app.listen(port, function(){
    console.log("test server on port 4000");
});

app.get('/', function(req, res){
    res.sendFile('home.html', {root: __dirname});
});

app.get('/run', function(req,res){
    var id = req.query.id;
    var template = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="/loading/css/loading.min.css">
    <script src="/loading/js/jquery-3.6.0.min.js"></script>
    <script src="/loading/js/loading.min.js"></script>
    <script>
    function show_loading(){
    	$.showLoading({name:'line-scale'});
	window.location.href = '/running/?id='+'${id}';
    }
    function hide_loading(){
	$.hideLoading();
	window.location.href = '/running/?id='+'${id}';
    }
    </script>
    </head>
    <body>
    <button onclick="show_loading();">run</button>
    </body>
    </html>
    <style>
    button {font-size: 25px;}
    </style>
    `
    //res.sendFile('/loading/loading.html',{root:__dirname});
    res.end(template);
})

app.get('/running',function(req,res){
    req.setTimeout(60*15*1000)
    var id = req.query.id;
    var downloadParams = {Bucket:'s3-gpmf-test-bucket112905-dev', Key:id}
    var mp4name = id.slice(id.lastIndexOf('/')+1);
    let file = fs.createWriteStream(mp4name);
    s3.getObject(downloadParams).createReadStream()
    .on('end',()=>{
        return resolve();
    })
    .on('error', (err)=>{
        return rejects(err);
    }).pipe(file)
    .on('close', () =>{
        
        const child1 = child_process.execFile("python3", ['./main.py', mp4name], {maxBuffer:2*1024*1024*1024}, function(err,stdout,stderr){
		//var resultfileName = mp4name.replace("gpmf.mp4", "result.json");
            // res.setHeader('Content-Disposition', `attachment; filename=${resultfileName}`);
            // res.sendFile(resultfileName, {root:__dirname});
            
		const child2 = child_process.execFile('rm', [mp4name, mp4name.replace("mp4", "json")], function(err,stdin,stdout){
                	var template = `
			<!DOCTYPE html>
			<html>
			<body>
			<script>
			window.location.href = '/download/?id='+'${id}';
			</script>
			</body>
			</html>
			`
			res.end(template);
            	})
        })
    })
})

app.get('/download', function(req,res){
    var id = req.query.id;
    var user_id = id.slice(id.indexOf('/')+1)
    user_id = user_id.slice(0,user_id.indexOf('/'));
    id = id.slice(id.lastIndexOf('/')+1)
    id = id.replace("gpmf.mp4","result.json")
    var template = `
	<!DOCTYPE html>
	<html>
	<script>
		function deleteNgo(){	
			window.location.href='/files/?id='+ '${user_id}'+'&rid='+'${id}';
		}
	</script>
	<body>
		<a class="btn" href="/${id}" download>download</a>
		<button onclick="deleteNgo()">GO BACK</button>
	</body>
	</html>
	`
	res.end(template)
})

app.get('/files', function(req,res){
    var id = req.query.id;
    var rid = req.query.rid;
    if(rid){
	    var child = child_process.execFile("rm",[rid],function(e,s,r){
	    });
    }
    var params = {
        Bucket: 's3-gpmf-test-bucket112905-dev',
        Prefix: 'public/' + id
    };
    s3.listObjectsV2(params, function(err, data){
        var list = `<ul>`;
        var content = data.Contents;
        var i = data.KeyCount - 1;
        while(i >= 0){
            if(content[i].Key.search("gpmf") != -1){
                list = list + `<li><a href="/run/?id=${content[i].Key}">${content[i].Key}</a></li>`;
            }
            i = i-1;
        }
        list = list + `</ul>`;
	//var filename = url.slice(url.lastIndexOf('/')+1);
	//filename = filename.replace("gpmf.mp4","result.json")
	//var child = child_process.execFile("rm",[filename],function(e,s,r){
	//});
        var template = `
        <!doctype html>
        <html>
            <head>MP4 list</head>  
	    <body>
                ${list}
            </body>
        </html>
	<style>
	li { margin: 20px;}
	</style>
        `;
        res.end(template);
    })
})
