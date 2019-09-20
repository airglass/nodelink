let wrapEl = document.querySelector('#wrap');
let lastEventPosition;
let touchstartPosition;
let activeNode;
let activeSourcePort;
let activeTempLink;
let activeTargetPort;
let renderers = {};
let canvasWidth;
let canvasHeight;

renderers.node = new airglass.Renderer(
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
renderers.exec = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.analyser = new airglass.Renderer(
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

    let targetPorts = [];
    let sourcePorts = [];

    let hosts = data.hosts;

    let hostTBPadding = 10;
    let hostLRPadding = 0;
    let portMargin = 5 * devicePixelRatio;
    let portSize = 18;
    let nameFontSize = 13 * devicePixelRatio;
    let nameBarHeight = 50;
    let itemMargin = 10 * devicePixelRatio;

    hosts.forEach((host, i) => {
      if (!host.id || !host.x || !host.y) return;
      let hue = host.hue == 0 ? host.hue : host.hue || 60;

      let _module = new airglass.Node({
        _id: host.id,
        _name: host.name,
        _hue: hue,
        _width: host.width,
        _height: host.height,
        x: host.x,
        y: host.y,
        r: 3,
        lineWidth: 1.5 * devicePixelRatio,
        fill: `hsla(${hue}, 70%, 50%, 0.2)`,
        stroke: `hsl(${hue}, 70%, 50%)`,
        nameFill: `hsl(${hue}, 100%, 50%)`,
        nameFontSize: nameFontSize,
        nameBarHeight: nameBarHeight,
        name: `${host.name} [${host.id}]`,
      });

      let moduleInitialHeight = nameBarHeight + hostTBPadding * 2;

      if (host.width) {
        _module.width = host.width;
      } else {
        _module.width = _module.getTextWidth(renderers.port.ctx) + hostLRPadding * 2 + portSize * 2;
      }

      let importPortsTotalHeight = host.imports.length * (portSize + portMargin * 2);
      let exportPortsToTalHeight = host.exports && host.exports.length * (portSize + portMargin * 2) || 0;
      let buttonsTotalHeight = host.buttons && host.buttons.length * (portSize + portMargin * 2) || 0;

      _module.imports = host.imports &&
        host.imports.length &&
        host.imports.map((portData, i) => {
          let x = _module.x;
          let y = _module.y + nameBarHeight + hostTBPadding + (exportPortsToTalHeight || buttonsTotalHeight) + portMargin * 2 + i * (portSize + portMargin * 2);
          if (exportPortsToTalHeight) {
            y += portMargin;
          }
          let ellipse = new airglass.Item({
            _type: 'target',
            _sourceNodeId: portData.sourceNodeId,
            _sourcePortId: portData.sourcePortId,
            _node: _module,
            x: x,
            y: y,
            size: portSize,
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
          targetPorts.push(ellipse)
          return ellipse;
        }) || [];

      _module.exports = host.exports &&
        host.exports.length &&
        host.exports.map((portData, i) => {
          let x = _module.x + _module.width;
          let y = _module.y + nameBarHeight + hostTBPadding + portMargin * 2 + i * (portSize + portMargin * 2);
          let ellipse = new airglass.Item({
            _type: 'source',
            _nodeId: host.id,
            _portId: portData.id,
            _node: _module,
            _processor: portData.processor,
            _params: portData.params || {},
            x: x,
            y: y,
            size: portSize,
            name: `${portData.processor} [${portData.id}]`,
            margin: itemMargin,
            nameFontSize: nameFontSize,
            dir: 'RTL',
            fill: `hsl(${hue}, 100%, 50%)`,
            stroke: `hsl(${hue}, 100%, 50%)`,
          });
          ellipse.updatePath();
          renderers.port.scene.add(ellipse);
          sourcePorts.push(ellipse)
          return ellipse;
        }) || [];

      _module.buttons = host.buttons &&
        host.buttons.length &&
        host.buttons.map((buttonData, i) => {
          let x = _module.x + _module.width + portSize / 2;
          let y = _module.y + nameBarHeight + hostTBPadding + portMargin * 2 + i * (portSize + portMargin * 2);
          let ellipse = new airglass.Item({
            _type: 'button',
            _node: _module,
            _exec: buttonData.exec,
            _params: buttonData.params || {},
            x: x,
            y: y,
            style: 'rect',
            size: portSize,
            name: buttonData.exec,
            margin: 10 * devicePixelRatio,
            nameFontSize: nameFontSize,
            dir: 'RTL',
            fill: `hsl(${hue}, 100%, 50%)`,
            stroke: `hsl(${hue}, 100%, 50%)`,
          });
          ellipse.updatePath();
          renderers.port.scene.add(ellipse);
          sourcePorts.push(ellipse)
          return ellipse;
        }) || [];

      if (host.height) {
        _module.height = host.height;
      } else {
        _module.height = moduleInitialHeight + importPortsTotalHeight + (exportPortsToTalHeight + buttonsTotalHeight);
        if (importPortsTotalHeight && (exportPortsToTalHeight || buttonsTotalHeight)) {
          _module.height += portMargin;
        }
      }
      _module.updatePath();
      renderers.node.scene.add(_module);
    });

    sourcePorts.forEach(sourcePort => {
      targetPorts.forEach(targetPort => {
        if (targetPort._sourceNodeId == sourcePort._nodeId && targetPort._sourcePortId == sourcePort._portId) {
          processing('connect', targetPort, sourcePort);
        }
      })
    })

    renderers.node.render();
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
        if (port._type == 'button') {
          tryExecButton('touchstart', port);
        }
      }

      let nodes = renderers.node.getElementsContainPoint(event);
      if (nodes.length) {
        activeNode = nodes[nodes.length - 1];
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

      if (activeNode) {
        activeNode.set({
          x: activeNode.x + event.x - lastEventPosition[0],
          y: activeNode.y + event.y - lastEventPosition[1],
        })
        activeNode.updatePath();
        renderers.node.render();

        activeNode.imports.forEach(port => {
          port.set({
            x: port.x + event.x - lastEventPosition[0],
            y: port.y + event.y - lastEventPosition[1],
          })
          port.updatePath();
        })
        activeNode.exports.forEach(port => {
          port.set({
            x: port.x + event.x - lastEventPosition[0],
            y: port.y + event.y - lastEventPosition[1],
          })
          port.updatePath();
        })
        activeNode.buttons.forEach(port => {
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
        if (activeSourcePort && !activeSourcePort._targetPort && port !== activeSourcePort) {
          if (port._type == 'target' && !port._sourceNodeId && !port._sourcePortId) {
            processing('connect', port, activeSourcePort);
          }
        }
        if (port === activeTargetPort) {
          if (port._sourcePort) {
            processing('disconnect', port);
          }
        }
        if (port._type == 'button') {
          tryExecButton('touchend', port);
        }
      }

      activeNode = null;
      activeSourcePort = null;
      activeTargetPort = null;
    }
  }

  lastEventPosition = [event.x, event.y];
}

function tryExecButton(type, button) {
  let execName = button._exec;
  let nodeId = button._node._id;
  try {
    funcs[nodeId] &&
      funcs[nodeId].execs &&
      funcs[nodeId].execs[execName] &&
      funcs[nodeId].execs[execName][type] &&
      funcs[nodeId].execs[execName][type].call(button);
  } catch (e) {
    console.log(`🔴${e.message}`);
  }
}

function processing(type, TP, SP) {
  let targetPort = TP;
  let sourcePort;
  let sourcePortProcessorName;
  if (type == 'connect') {
    sourcePort = SP;
    sourcePort._targetPort = targetPort;
    targetPort._sourcePort = sourcePort;
    targetPort._sourceNodeId = sourcePort._nodeId;
    targetPort._sourcePortId = sourcePort._portId;
  }
  if (type == 'disconnect') {
    sourcePort = targetPort._sourcePort;
  }
  sourcePortProcessorName = sourcePort._processor;
  sourceNameId = sourcePort._node._id;
  try {
    funcs[sourceNameId] &&
      funcs[sourceNameId].processors &&
      funcs[sourceNameId].processors[sourcePortProcessorName] &&
      funcs[sourceNameId].processors[sourcePortProcessorName].call(sourcePort, type, targetPort);
  } catch (e) {
    console.log(`🔴${e.message}`);
    // 连接发生错误
    if (type == 'connect') {
      sourcePort._targetPort = null;
      targetPort._sourcePort = null;
      targetPort._sourceNodeId = null;
      targetPort._sourcePortId = null;
    }
    // 断开连接发生错误
    if (type == 'disconnect') {

    }
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
// 清除_sourceNodeId和_sourcePortId
// 更新渲染line的Glass（擦玻璃+重新画）
function deleteLineByTargetPorts() {
  let targetPort = [].slice.call(arguments, 0);
  renderers.link.scene.children.forEach((link, linkIndex) => {
    targetPort.forEach(targetPort => {
      if (targetPort == link.endPoint) {
        targetPort._sourcePort._targetPort = null;
        targetPort._sourcePort = null;
        targetPort._sourceNodeId = undefined;
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
    hosts: renderers.node.scene.children.map(hostChild => {
      return {
        id: hostChild._id,
        x: hostChild.x,
        y: hostChild.y,
        hue: hostChild._hue,
        width: hostChild._width,
        height: hostChild._height,
        name: hostChild._name,
        imports: hostChild.imports.map(importPort => {
          return {
            sourceNodeId: importPort._sourceNodeId,
            sourcePortId: importPort._sourcePortId,
            name: importPort.name,
          }
        }),
        buttons: hostChild.buttons.map(button => {
          return {
            exec: button._exec,
            params: button._params
          }
        }),
        exports: hostChild.exports.map(exportPort => {
          return {
            id: exportPort._portId,
            params: exportPort._params,
            processor: exportPort._processor,
          }
        })
      }
    })
  };
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

function getAudioBufferByFileURI(url, cb) {
  let audioContext = new AudioContext();
  let client = new XMLHttpRequest();
  client.responseType = 'arraybuffer';
  client.onreadystatechange = () => {
    if (client.status == 200 && client.readyState == 4) {
      audioContext.decodeAudioData(client.response)
        .then(audioBuffer => {
          cb(audioBuffer);
        })
    }
  }
  client.open('GET', url, true);
  client.send(null);
}