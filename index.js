const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http')
const https = require('https')
// const formidable = require('express-formidable');
const bodyParser = require('body-parser')

// app.use(formidable())

let proxyPath = "http://127.0.0.1:8080";
let port = 9090;

process.argv.forEach((key, index) => {
  if (key === "-port") {
    port = process.argv[index + 1];
  } else if (key === '-path') {
    proxyPath = process.argv[index + 1];
  }
})

console.log(`proxyPath=${proxyPath}`);
console.log(`port=${port}`);


// 测试Server端 express

// Cache-Control 设置缓存
app.get('*', function(req, res, next) {
  /**
   *  @title 设置缓存 (在HTTP/1.0)
   *  @private 在服务器设置了private比如Cache-Control: private , max-age=60的情况下，表示只有用户的浏览器可以缓存private响应，不允许任何中继Web代理对其进行缓存
   *  @public 如果设置了public，表示该响应可以再浏览器或者任何中继的Web代理中缓存，public是默认值，即Cache-Control: max-age=60等同于Cache-Control: public , max-age=60。
   *  @Expires Expires 表示存在时间，允许客户端在这个时间之前不去检查（发请求），等同max-age的效果 但是如果同时存在，则被Cache-Control的max-age覆盖。
   */
  if (/\.(js|css)$/.test(req.url)) {
    res.setHeader('Cache-Control', 'private,max-age=' + 1000 * 60 * 60); // 强缓存 静态资源 返回状态码  200 (disk cache)
  }
  next()
});

function requireHTTP (url, options, requestData) {
  return new Promise((resolve, reject) => {
    const request = url.includes('https://') ? https.request : http.request
    const req = request(url, options, (res) => {
      let data = ''
      res.setEncoding('utf8');
      res.on('data', (chunk) => { // data 事件在callbackFn里面
        // console.log(chunk);
        data += chunk
      });
      res.on('end', () => { // end 事件在callbackFn里面
        resolve(data)
      });
    });
    req.on('error', (e) => {
      reject(e)
      console.log('error', e.message);
    });
    if (requestData) {
      // console.log('requestData', requestData)
      req.write(requestData);
    }
    req.end();
  })
}

app.all('*', function(req, res, next) {
  console.log('cros ===== ')
  res.header('Access-Control-Allow-Credentials', 'true');
  // href 设置指定的白名单域名 例如 "https://www.baidu.com"
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
  res.header('X-Powered-By', '3.2.1');
  // res.header('Content-Type', 'application/json;charset=utf-8');
  next();
});

app.use(express.static('./public'));

app.use(bodyParser.json())

app.use((req, res, next) => {
  console.log('Time: ', Date.now())

  // if (req.url.includes('/#') || req.url === '/') {
  //   res.type('text/plain');
  //   res.send(fs.readFileSync('./examples/index.html'))
  // }
  next()
})

app.use((req, res, next) => {
    let options = { method: req.method };
    let requestData;
    if (['post', 'put', 'delete'].includes(req.method.toLocaleLowerCase()) && Object.keys(req.body).length) {
      requestData = JSON.stringify(req.body);
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    }
    requireHTTP(`${proxyPath}${req.url}`, options, requestData).then(result => {
      res.send(result)
    }).catch(err => {
      res.send(err)
    })
    return
})

app.use(function(req, res) {
  res.status(404);
  res.send('404 not found');
});

app.listen(port, function() {
  console.log(`Express started on http://localhost:${port}; press Ctrl + c to terminate.`);
});

