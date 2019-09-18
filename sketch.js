let wrapEl = document.querySelector('#wrap');
let lastEventPosition;
let touchstartPosition;
let activeHost;
let activeSourcePort;
let activeTempLink;
let activeTargetPort;
let renderers = {};
let canvasWidth;
let canvasHeight;
let audioContext = new AudioContext();
let processors = {
  fileURI: function (type) {
    console.log(this)
    switch (type) {
      case 'connect':
        this.data = `${this.exports[0].name}.mp3`;
        createLineBySourcePort(port);
        break;
      case 'disconnect':
        break;
    }
  },
  FileLoader: function (type) {
    switch (type) {
      case 'connect':
        // 如果AudioBuffer还在就不要再次加载了，提升速度
        let url = this.imports[0].sourcePort && this.imports[0].sourcePort._node.data;
        console.log(url)
        if (!url) {
          showTip('error', 'request mp3 file uri');
          break;
        }
        let client = new XMLHttpRequest();
        client.responseType = 'arraybuffer';
        client.onreadystatechange = () => {
          if (client.status == 200 && client.readyState == 4) {
            audioContext.decodeAudioData(client.response)
              .then(audioBuffer => {
                this.data = audioBuffer;
                createLineBySourcePort(port);
              })
          }
        }
        client.open('GET', url, true);
        client.send(null);
        break;
      case 'disconnect':
        deleteLineByTargetPorts(port);
        break;
    }
  },
  createAudioSource: function (type) {
    switch (type) {
      case 'connect':
        let audioBuffer = this.imports[0].sourcePort &&
          this.imports[0].sourcePort._node.data;
        if (!audioBuffer) {
          showTip('error', 'request audio buffer');
          break;
        } else {
          let bufferSource = audioContext.createBufferSource();
          bufferSource.buffer = audioBuffer;
          this.data = bufferSource;
          if (port.targetPort._node.name.toLowerCase() == 'speaker') {
            bufferSource.connect(audioContext.destination);
            bufferSource.start(0, 0);
            createLineBySourcePort(port);
          }
        }
        break;
      case 'disconnect':
        deleteLineByTargetPorts(port)
        break;
    }
  },
  speaker: function (type) {
    switch (type) {
      case 'connect':

        break;
      case 'disconnect':
        let bufferSource = port.sourcePort._node.data;
        bufferSource.disconnect();
        deleteLineByTargetPorts(port);
        break;
    }
  }
}

renderers.host = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.link = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.tempLink = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.port = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.controller = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
).setInteractable();


loadData('data.json')
  .then(data => {
    canvasWidth = data.width || 600;
    canvasHeight = data.height || 300;
    setSize(canvasWidth, canvasHeight);

    let importPorts = [];
    let exportPorts = [];

    let hosts = data.hosts;

    let hostTBPadding = 10;
    let hostLRPadding = 14;
    let portMargin = 5 * devicePixelRatio;
    let portSize = 18;
    let lineWidth = 3;
    let nameFontSize = 15 * devicePixelRatio;
    let nameBarHeight = 50;
    let itemMargin = 10 * devicePixelRatio;

    hosts.forEach((host, i) => {
      if (!host.id || !host.x || !host.y) return;
      let hue = host.hue == 0 ? host.hue : host.hue || 60;

      let _module = new airglass.Node({
        _id: host.id,
        _hue: hue,
        x: host.x,
        y: host.y,
        r: 3,
        lineWidth: 1.5 * devicePixelRatio,
        fill: `hsla(${hue}, 70%, 50%, 0.2)`,
        stroke: `hsl(${hue}, 70%, 50%)`,
        nameFill: `hsl(${hue}, 100%, 50%)`,
        nameFontSize: nameFontSize,
        nameBarHeight: nameBarHeight,
        name: host.name || host.id,
      });

      let moduleInitialHeight = nameBarHeight + hostTBPadding * 2;

      if (host.width) {
        _module.width = host.width;
      } else {
        _module.width = _module.getTextWidth(renderers.port.ctx) + hostLRPadding * 2 + portSize * 2;
      }

      let importPortsTotalHeight = host.imports.length * (portSize + portMargin * 2);
      let exportPortsToTalHeight = host.exports.length * (portSize + portMargin * 2);

      _module.imports = host.imports &&
        host.imports.length &&
        host.imports.map((portData, i) => {
          let x = _module.x;
          let y = _module.y + nameBarHeight + hostTBPadding + exportPortsToTalHeight + portMargin * 1.5 + i * (portSize + portMargin * 2);
          if (exportPortsToTalHeight) {
            y += portMargin;
          }
          let ellipse = new airglass.Item({
            _type: 'target',
            _sourceHostId: portData.sourceHostId,
            _sourcePortId: portData.sourcePortId,
            _node: _module,
            x: x,
            y: y,
            width: portSize,
            height: portSize,
            nameFontSize: nameFontSize,
            dir: 'LTR',
            name: portData.name,
            margin: itemMargin,
            lineWidth: 1,
            fill: `hsl(${hue}, 100%, 50%)`,
            stroke: `hsl(${hue}, 100%, 50%)`,
          });
          ellipse.updatePath();
          renderers.port.scene.add(ellipse)
          importPorts.push(ellipse)
          return ellipse;
        }) || [];

      _module.exports = host.exports &&
        host.exports.length &&
        host.exports.map((portData, i) => {
          let x = _module.x + _module.width;
          let y = _module.y + nameBarHeight + hostTBPadding + portMargin * 2 + i * (portSize + portMargin * 2);
          let ellipse = new airglass.Item({
            _type: 'source',
            _hostId: host.id,
            _portId: portData.id,
            _node: _module,
            _processor: portData.processor,
            x: x,
            y: y,
            width: portSize,
            height: portSize,
            name: portData.name,
            margin: itemMargin,
            nameFontSize: nameFontSize,
            dir: 'RTL',
            fill: `hsl(${hue}, 100%, 50%)`,
            stroke: `hsl(${hue}, 100%, 50%)`,
          });
          ellipse.updatePath();
          renderers.port.scene.add(ellipse);
          exportPorts.push(ellipse)
          return ellipse;
        }) || [];


      if (host.height) {
        _module.height = host.height;
      } else {
        _module.height = moduleInitialHeight + importPortsTotalHeight + exportPortsToTalHeight;
        if (importPortsTotalHeight && exportPortsToTalHeight) {
          _module.height += portMargin;
        }
      }
      _module.updatePath();
      renderers.host.scene.add(_module);
    });

    exportPorts.forEach(exportPort => {
      importPorts.forEach(importPort => {
        if (importPort._sourceHostId == exportPort._hostId && importPort._sourcePortId == exportPort._portId) {
          exportPort.targetPort = importPort;
          importPort.sourcePort = exportPort;
          let moduleLine = new airglass.BezierLine(
            exportPort,
            importPort
          )
          moduleLine.updatePath();
          moduleLine.stroke = `hsl(${exportPort._node._hue}, 100%, 50%)`;
          moduleLine.lineWidth = lineWidth;
          renderers.link.scene.add(moduleLine);
        }
      })
    })


    renderers.host.render();
    renderers.port.render();
    renderers.link.render();
  })

renderers.controller.subscribe(renderers.controller, rendererSubscribe)

function rendererSubscribe(actor) {
  let event = actor.event;
  // 初始化上次事件位置
  !lastEventPosition && (lastEventPosition = [event.x, event.y]);

  if (event.type == 'touchstart') {
    touchstart: {
      // 初始化touchstart事件位置
      lastTouchstartPosition = [event.x, event.y];
      let ports = renderers.port.getElementsContainPoint(event);
      if (ports.length) {
        let port = ports[ports.length - 1];
        if (port._type == 'source') {
          activeSourcePort = port;
          break touchstart;
        }
        if (port._type == 'target') {
          activeTargetPort = port;
          break touchstart;
        }
      }

      let hosts = renderers.host.getElementsContainPoint(event);
      if (hosts.length) {
        activeHost = hosts[hosts.length - 1];
        break touchstart;
      }
    }
  }

  if (event.type == 'touchmove') {
    touchmove: {
      if (lastEventPosition[0] == event.x && lastEventPosition[1] == event.y) {
        break touchmove;
      }

      if (activeSourcePort) {
        renderers.tempLink.clean();
        let link = new airglass.BezierLine(
          activeSourcePort,
          event
        )
        link.stroke = `hsl(${activeSourcePort._node._hue}, 100%, 50%)`;
        link.lineWidth = 3;
        link.updatePath();
        renderers.tempLink.scene.children = [link];
        renderers.tempLink.render();
        break touchmove;
      }

      if (activeHost) {
        activeHost.set({
          x: activeHost.x + event.x - lastEventPosition[0],
          y: activeHost.y + event.y - lastEventPosition[1],
        })
        activeHost.updatePath();
        renderers.host.render();

        activeHost.imports.forEach(port => {
          port.set({
            x: port.x + event.x - lastEventPosition[0],
            y: port.y + event.y - lastEventPosition[1],
          })
          port.updatePath();
        })
        activeHost.exports.forEach(port => {
          port.set({
            x: port.x + event.x - lastEventPosition[0],
            y: port.y + event.y - lastEventPosition[1],
          })
          port.updatePath();
        })
        renderers.port.render();
        renderers.link.scene.children.forEach(link => {
          link.updatePath();
        })
        renderers.link.render();
      }
    }
  }

  if (event.type == 'touchend') {
    touchend: {
      renderers.tempLink.clean();
      let ports = renderers.port.getElementsContainPoint(event);
      if (ports.length) {
        let port = ports[ports.length - 1];
        if (activeSourcePort && port !== activeSourcePort && port._type == 'target') {
          if (!port._sourceHostId && !port.sourcePortId) {
            processing('connect', port, activeSourcePort);
          }
        }
        if (port === activeTargetPort) {
          if (port.sourcePort) {
            processing('disconnect', port);
          }
        }
      }

      if (activeHost || activeSourcePort || activeTargetPort) {
        exportData();
      }

      activeHost = null;
      activeSourcePort = null;
      activeTargetPort = null;
    }
  }

  lastEventPosition = [event.x, event.y];
}

function processing(type, TP, SP) {
  let targetPort = TP;
  let sourcePort;
  let sourcePortProcessorName;
  switch (type) {
    case 'connect':
      sourcePort = SP;
      sourcePort._targetPort = targetPort;
      targetPort._sourcePort = sourcePort;
      targetPort._sourceHostId = sourcePort._hostId;
      targetPort._sourcePortId = sourcePort._portId;
      break;
    case 'disconnect':
      sourcePort = targetPort._sourcePort;
      break;
  }
  sourcePortProcessorName = sourcePort._processor;
  sourcePortProcessorName &&
    processors[sourcePortProcessorName] &&
    processors[sourcePortProcessorName].call(sourcePort, 'disconnect');
}

function showTip(type, message) {
  switch (type) {
    case 'error':
      console.error(message.toUpperCase());
      break;
    case 'info':
      console.info(message.toUpperCase());
      break;
  }
}

function createLineBySourcePort(sourcePort) {
  let port = sourcePort._targetPort;
  let link = new airglass.BezierLine(
    sourcePort,
    port
  )
  link.updatePath();
  link.stroke = `hsl(${sourcePort._node._hue}, 100%, 50%)`;
  link.lineWidth = 3;
  renderers.link.scene.add(link);
  renderers.link.render();
}

// 清除port循环引用关系
// 清除line
// 清除_sourceHostId和_sourcePortId
// 更新渲染line的Glass（擦玻璃+重新画）
function deleteLineByTargetPorts() {
  let targetPort = [].slice.call(arguments, 0);
  renderers.link.scene.children.forEach((link, linkIndex) => {
    targetPort.forEach(targetPort => {
      if (targetPort == link.endPoint) {
        targetPort._sourcePort.targetPort = null;
        targetPort._sourcePort = null;
        targetPort._sourceHostId = undefined;
        targetPort._sourcePortId = undefined;
        renderers.link.scene.children.splice(linkIndex, 1);
      }
    })
    renderers.link.render();
  })
}

function exportData() {
  let data = {
    width: canvasWidth,
    height: canvasHeight,
    hosts: renderers.host.scene.children.map(hostChild => {
      return {
        id: hostChild._id,
        x: hostChild.x,
        y: hostChild.y,
        processor: hostChild._processor,
        hue: hostChild._hue,
        width: hostChild.width,
        height: hostChild.height,
        name: hostChild.name,
        imports: hostChild.imports.map(importPort => {
          return {
            sourceHostId: importPort._sourceHostId,
            sourcePortId: importPort._sourcePortId,
            name: importPort.name,
          }
        }),
        exports: hostChild.exports.map(exportPort => {
          return {
            id: exportPort._portId,
            name: exportPort.name,
            processor: exportPort._processor,
          }
        })
      }
    })
  };
  // console.log(JSON.stringify(data))
  return data;
}

function loadData(url) {
  return new Promise((resolve, reject) => {
    let client = new XMLHttpRequest();
    client.responseType = 'json';
    client.onreadystatechange = function () {
      if (client.status == 200 && client.readyState == 4) {
        resolve(client.response)
      }
    };
    client.open('GET', url, true);
    client.send(null);
  })
}

function setSize(width, height) {
  for (let name in renderers) {
    let renderer = renderers[name];
    renderer.ctx.canvas.dataset.name = name;
    renderer.ctx.canvas.width = width * devicePixelRatio;
    renderer.ctx.canvas.height = height * devicePixelRatio;
    renderer.ctx.canvas.style = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;`;
  }
  wrapEl.style.width = `${width}px`;
  wrapEl.style.height = `${height}px`;
  wrapEl.style.position = `relative`;
}