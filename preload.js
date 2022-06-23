// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const request = require('request');;
let authorization = '';
const ua = 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36';
let teamId = '';
let teamName = '';
let folderId = '';
let folderName = '';
let projectId = '';
let projectName = '';
window.addEventListener('DOMContentLoaded', init)
const { webFrame } = require('electron')
const BrowserWindow = require('electron').remote.BrowserWindow;
const path = require('path')
webFrame.setVisualZoomLevelLimits(0.5, 3)
webFrame.setZoomFactor(1)
// webFrame.setZoomLevel(4)

//初始化
function init() {
  document.getElementById("btn").onclick = submit;
  document.getElementById("new-window-btn").onclick = newWindow;
  document.getElementById("goto-btn").onclick = loadFromUrl;
  document.getElementById("password").onkeypress = function (event) {
    if (event.which === 13) {
      submit(event)
    }
  }
  document.getElementById("goto-input").onkeypress = function (event) {
    if (event.which === 13) {
      loadFromUrl(event)
    }
  }
}

function find_link(link, callback) {

  var f = function (link) {
      var options = {
          url: link,
          followRedirect: false,
          headers : {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept-Charset': 'UTF-8;',
              'User-Agent':'Mozilla/5.0 (Windows; U; Windows NT 5.1; zh-CN; rv:1.9.2.8) Firefox/3.6.8',
          }
      }

      request(options, function (error, response, body) {
          console.log(response.statusCode);
          if (response.statusCode == 301 || response.statusCode == 302) {
              var location = response.headers.location;
              console.log('location: ' + location);
              f(location);
          } else {
              //console.log(body);
              callback(link);
          }
      })
  }

  f(link);
}

function reportError(e, message){
  var errorBox = document.getElementById("error-box");
  errorBox.innerHTML = `<p>${message}</p>`;
  setTimeout(()=>{
    errorBox.innerHTML = "";
  }, 3000);
}

//登录
function submit(e) {
  var email = encodeURIComponent(document.getElementById('username').value)
  var password = encodeURIComponent(document.getElementById('password').value)
  request({
    url: `https://lanhuapp.com/api/account/login`,
    method: "POST",
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'user-agent': ua
    },
    body: `email=${email}&password=${password}`
  }, function (error, response, body) {
    console.log('login..')
    console.log(response)
    if (!error && response.statusCode == 200) {
      if(JSON.parse(body).token){
        authorization = 'Basic ' + btoa(JSON.parse(body).token + ':');
        console.log(authorization);
        loadTeam();
      }else{
        reportError(e, response.body);
      }
    } else {
      reportError(e, response.body);
    }
  });
}

function newWindow(e) {

  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

}

//goto
function loadFromUrl(e) {
  console.log(`load from url..`)
  var url = document.getElementById('goto-input').value
  if (url.indexOf("lanhuapp.com/web/#/item/project") === -1 
  && url.indexOf("lanhuapp.com/web/#!/item/project") === -1 
  && url.indexOf("lanhuapp.com/web/#/user/invite") === -1 
  && url.indexOf("lanhuapp.com/web/#!/user/invite") === -1
  && url.indexOf("lanhuapp.com/web/#/user/login") === -1 
  && url.indexOf("lanhuapp.com/web/#!/user/login") === -1) {
    if(url.indexOf("lanhuapp.com/url/") !== -1){
      find_link(url, function(link){
        document.getElementById('goto-input').value = link
        loadFromUrl(e);
      })
    } else {
      console.log(`not a lanhu board url: ${url}`);
    }
    return;
  }
  query = url.substr(url.indexOf("?") + 1);
  var vars = query.split("&");
  var queryMap = new Map()
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    queryMap.set(pair[0], pair[1])
  }
  var urlProjectId = queryMap.get("project_id");
  if(!urlProjectId){
    urlProjectId = queryMap.get("pid");
    if(!urlProjectId){
      console.log(`project_id not found: ${url}`)
      return;
    }
  }

  var urlImageId = queryMap.get("image_id");
  var urlTeamId = undefined
  request({
    url: `https://lanhuapp.com/api/project/project_info?pid=${urlProjectId}&basic_info=1`,
    method: "GET",
    json: true,
    headers: {
      "authorization": authorization,
      'user-agent': ua
    }
  }, function (error, response, body) {
    console.log(response);
    if (!error && response.statusCode == 200) {
      urlTeamId = response.body.result["team_id"]
      var urlProjectName = response.body.result["name"]

      teamId = urlTeamId;
      projectId = urlProjectId;
      loadImages(e, {
        "projectId": urlProjectId,
        "imageId": urlImageId,
        "projectName": urlProjectName
      });
    }
  });
}
//加载小组
function loadTeam(e) {
  console.log('load teams..')
  request({
    url: "https://lanhuapp.com/api/account/user_teams",
    method: "GET",
    json: true,
    headers: {
      "authorization": authorization,
      'user-agent': ua
    }
  }, function (error, response, body) {
    console.log(response);
    if (!error && response.statusCode == 200) {
      var innerHTML = '';
      body.result.forEach(i => {
        var name = i.name;
        var id = i.id;
        innerHTML = innerHTML + `<button class="btn team-btn" id="${id}" data-id="${id}" data-name="${name}">${name}</button>`;
      });
      document.getElementById('teams-title').innerText = "TEAMS";
      document.getElementById('teams').innerHTML = innerHTML;
      var btns = document.getElementsByClassName('team-btn');
      for (i = 0; i < btns.length; i++) {
        btns[i].onclick = loadFolder
      }
    }
  });
}
//加载文件夹
function loadFolder(e) {
  console.log('load folders..')
  teamId = this.getAttribute("data-id")
  teamName = this.getAttribute("data-name")
  request({
    url: `https://lanhuapp.com/api/project/folder?team_id=${teamId}&all_folder=true&default_order=desc`,
    method: "GET",
    json: true,
    headers: {
      "authorization": authorization,
      'user-agent': ua
    }
  }, function (error, response, body) {
    console.log(response);
    if (!error && response.statusCode == 200) {
      var innerHTML = '';
      body.result.folders_info.forEach(i => {
        var name = i.name;
        var id = i.id;
        innerHTML = innerHTML + `<button class="btn folder-btn" id="${id}" data-id="${id}" data-name="${name}">${name}</button>`;
      });
      document.getElementById('folders-title').innerText = `FOLDERS(${teamName})`;
      document.getElementById('folders').innerHTML = innerHTML;
      var btns = document.getElementsByClassName('folder-btn');
      for (i = 0; i < btns.length; i++) {
        btns[i].onclick = loadProject
      }
    }
  });
}
//加载项目
function loadProject(e) {
  folderId = this.getAttribute("data-id")
  folderName = this.getAttribute("data-name")
  request({
    url: `https://lanhuapp.com/api/account/folder_projects?folder_id=${folderId}&pageNo=0&team_id=${teamId}&pageSize=999&default_order=desc`,
    method: "GET",
    json: true,
    headers: {
      "authorization": authorization,
      'user-agent': ua
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body)
      var innerHTML = '';
      body.result.projects_info.forEach(i => {
        var name = i.name;
        var id = i.id;
        innerHTML = innerHTML + `<button class="btn project-btn" id="${id}" data-id="${id}" data-name="${name}">${name}</button>`;
      });
      document.getElementById('projects-title').innerText = `PROJECTS(${folderName})`;
      document.getElementById('projects').innerHTML = innerHTML;
      var btns = document.getElementsByClassName('project-btn');
      for (i = 0; i < btns.length; i++) {
        btns[i].onclick = loadImages
      }
    }
  });
}

//加载图片
function loadImages(e, data) {
  console.log('load images..')
  if(data){
    projectId = data.projectId
    projectName = data.projectName
  }else{
    projectId = this.getAttribute("data-id")
    projectName = this.getAttribute("data-name")
  }
  request({
    url: `https://lanhuapp.com/api/project/project_info?pid=${projectId}&pageNo=0&pageSize=999&team_id=${teamId}`,
    method: "GET",
    json: true,
    headers: {
      "authorization": authorization,
      'user-agent': ua
    }
  }, function (error, response, body) {
    console.log(response)
    if (!error && response.statusCode == 200) {
      var innerHTML = '';
      var images = body.result.images
      var min_x = 999999;
      var min_y = 999999;
      images.forEach(i => {
        if (i["position_x"] < min_x) min_x = i["position_x"];
        if (i["position_y"] < min_y) min_y = i["position_y"];
      })
      console.log(`min_x: ${min_x},min_y: ${min_y}`)
      min_x = 50 - min_x
      min_y = 600 - min_y
      images.forEach(i => {
        var name = i.name;
        var id = i.id;
        var url = i.url;
        var top = i["position_y"] + min_y;
        var left = i["position_x"] + min_x;
        var width = i["width"];
        var height = i["height"];
        var zindex = "auto";
        var background = "transparent"
        if (url === '') {
          zindex = 3;
          background = "#fff9bc"
        }
        innerHTML = innerHTML + `<div class="basic-label" style="outline: rgb(62, 147, 255) solid 1px; background: ${background};position: absolute; top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px; transition: all 0.2s ease 0s; z-index: ${zindex};">`
        if (url === '') {
          var inner_scale = 1;
          var inner_width = width;
          var text_scale = i["text_scale"];
          if (text_scale) {
            inner_scale = JSON.parse(text_scale)["scale"];
            inner_width = JSON.parse(text_scale)["width"];
          }
          innerHTML = innerHTML + `<pre style="transform: scale(${inner_scale});pointer-events: none;width: ${inner_width}px;font-size: 14px;transform-origin: 0px 0px;cursor: text;user-select: none;">标签 -- ${name}</pre>`;
        } else {
          innerHTML = innerHTML + `<span class="basic-image-label" style="font-size: 14px; white-space: nowrap;">贴图 -- ${name}</span>`;
          innerHTML = innerHTML + `<img class="basic-image" width="${width}" height="${height}" id="${id}" src="${url}"/>`;
        }
        innerHTML = innerHTML + '</div>';


      });
      document.getElementById('images-title').innerText = `IMAGES(${projectName})`;
      document.getElementById('images').innerHTML = innerHTML;
      document.title = projectName;
      if (data && data.imageId) {
        console.log("goto the image...");
        document.getElementById(data.imageId).scrollIntoView();
      }
    }
  });
}

