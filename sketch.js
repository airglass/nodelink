let rendererManager = new airglass.RendererManager(document.querySelector('#wrap'));
let lastEventPosition;
let touchstartPosition;
let activeNode;
let activeSourcePort;
let activeTempLink;
let activeTargetPort;
let renderers = {};

renderers.node = rendererManager.generate();
renderers.link = rendererManager.generate();
renderers.linkLight = rendererManager.generate();
renderers.tempLink = rendererManager.generate();
renderers.port = rendererManager.generate();
renderers.exec = rendererManager.generate();
renderers.analyser = rendererManager.generate();
renderers.controller = rendererManager.generate().setInteractable();

loadData('data.json')
  .then(data => {
    let width = data.width || 800;
    let height = data.height || 400;
    rendererManager.setSize(width, height);

    let targetPorts = [];
    let sourcePorts = [];

    let hosts = data.hosts;

    // 标题栏内边距
    let namePadding = 6 * devicePixelRatio;

    let portSize = 8 * devicePixelRatio;
    let portMargin = portSize * .8;
    let hostTBPadding = portMargin;
    let hostLRPadding = namePadding;

    // 标题高度
    let nameFontSize = 12 * devicePixelRatio;
    let nameBarHeight = nameFontSize + namePadding * 2;
    let itemMargin = portSize;
    let portOffsetY = portSize / 2 + portMargin;

    hosts.forEach((host, i) => {
      if (!host.id || !host.x || !host.y) return;
      let hue = host.hue == 0 ? host.hue : host.hue || 60;

      let _module = new airglass.Node({
        _id: host.id,
        _name: host.name,
        _hue: hue,
        _width: host.width,
        _height: host.height,
        _type: host.type,
        x: host.x,
        y: host.y,
        r: 3,
        lineWidth: 1.5 * devicePixelRatio,
        fill: `hsla(${hue}, 70%, 50%, 0.2)`,
        stroke: `hsl(${hue}, 70%, 50%)`,
        nameFill: `hsl(${hue}, 100%, 50%)`,
        nameFontSize: nameFontSize,
        nameBarHeight: nameBarHeight,
        name: host.name,
      });

      let moduleInitialHeight = nameBarHeight + hostTBPadding;

      if (host.width) {
        _module.width = host.width;
      } else {
        _module.width = _module.getTextWidth(renderers.port.ctx) + hostLRPadding * 2;
      }

      let singlePortPlaceholderHeight = portSize + portMargin * 2;
      let importPortsTotalHeight = host.imports.length * singlePortPlaceholderHeight;
      let exportPortsToTalHeight = host.exports.length * singlePortPlaceholderHeight;

      _module.imports = host.imports &&
        host.imports.length &&
        host.imports.map((portData, i) => {
          let x = _module.x;
          let y = _module.y + moduleInitialHeight + i * singlePortPlaceholderHeight;
          let ellipse = new airglass.Item({
            _type: 'target',
            _sourceNodeId: portData.sourceNodeId,
            _sourcePortId: portData.sourcePortId,
            _node: _module,
            _name: portData.name,
            x: x,
            y: y + portOffsetY,
            size: portSize,
            nameFontSize: nameFontSize,
            dir: 'LTR',
            name: portData.name || '无名',
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
          let y = _module.y + moduleInitialHeight + i * singlePortPlaceholderHeight;
          let ellipse = new airglass.Item({
            _type: 'source',
            _nodeId: host.id,
            _portId: portData.id,
            _node: _module,
            _processor: portData.processor,
            _name: portData.name,
            _params: portData.params || {},
            x: x,
            y: y + portOffsetY,
            size: portSize,
            name: portData.name || '无名',
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

      if (host.height) {
        _module.height = host.height;
      } else {
        _module.height = moduleInitialHeight + airglass.max([importPortsTotalHeight, exportPortsToTalHeight]) + hostTBPadding;
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

    let keyboardNode = getNodeById('keyboard-01');
    let keyToOsc = {};
    keyboardNode.imports.forEach(targetPort => {
      let oscillator = targetPort._data;
      keyToOsc[targetPort._name] = oscillator;
    })
    let keyToKey = {
      a: 'C4',
      s: 'D4',
      d: 'E4',
      f: 'F4',
      g: 'G4',
      h: 'A4',
      j: 'B4',
    };
    document.addEventListener('keypress', function (e) {
      let soundKey = keyToKey[e.key];
      if (soundKey) {
        let oscillator = keyToOsc[soundKey];
        if (!oscillator._isConnected) {
          oscillator.connect(oscillator.context.destination);
          oscillator._isConnected = true;
        }
        if (!oscillator._isStart) {
          oscillator.start(0, 0);
          oscillator._isStart = true;
        }
      }
    })
    document.addEventListener('keyup', function (e) {
      let soundKey = keyToKey[e.key];
      if (soundKey) {
        let oscillator = keyToOsc[soundKey];
        if (oscillator._isConnected) {
          oscillator.disconnect();
          oscillator._isConnected = false;
        }
      }
    })

  })

renderers.controller.subscribe(renderers.controller, function rendererSubscribe(actor) {
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
          console.table({
            '输出ID': activeSourcePort._portId,
            name: activeSourcePort._name,
            params: JSON.stringify(activeSourcePort._params),
            processor: activeSourcePort._processor,
          })
          break touchstart;
        }
        if (port._type == 'target') {
          activeTargetPort = port;
          console.table({
            name: activeTargetPort._name,
            '有无数据': !!activeTargetPort._data,
            sourceNodeId: activeTargetPort._sourceNodeId,
            sourcePortId: activeTargetPort._sourcePortId,
          })
          break touchstart;
        }
      }

      let nodes = renderers.node.getElementsContainPoint(event);
      if (nodes.length) {
        activeNode = nodes[nodes.length - 1];
        console.table({
          '节点ID': activeNode._id,
          name: activeNode._name,
          type: activeNode._type,
        })
        break touchstart;
      }
    }
  }

  if (event.type == 'mousemove') {
    renderers.linkLight.scene.children = [];
    renderers.link.scene.children.forEach(link => {
      let light = link.updateLight();
      let _l = new airglass.BezierLine(link.startPoint, link.endPoint);
      let lg = renderers.linkLight.ctx.createLinearGradient(light.p1.x, light.p1.y, light.p2.x, light.p2.y);
      lg.addColorStop(0, 'transparent');
      lg.addColorStop(.4, '#fff');
      lg.addColorStop(.6, '#fff');
      lg.addColorStop(1, 'transparent');
      _l.stroke = lg;
      _l.updatePath();
      renderers.linkLight.scene.add(_l);
    })
    renderers.linkLight.render();
  }

  if (event.type == 'touchmove') {
    touchmove: {
      if (lastEventPosition[0] == event.x && lastEventPosition[1] == event.y) {
        break touchmove;
      }

      if (activeSourcePort) {
        renderers.tempLink.clean();
        let link = new airglass.NodeLine(
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
      }

      activeNode = null;
      activeSourcePort = null;
      activeTargetPort = null;
    }
  }

  lastEventPosition = [event.x, event.y];
});

function processing(type, TP, SP) {
  let targetPort = TP;
  let sourcePort;
  let sourcePortProcessorName;
  if (type == 'connect') {
    sourcePort = SP;
  }
  if (type == 'disconnect') {
    sourcePort = targetPort._sourcePort;
  }
  let nodeType = sourcePort._node._type;
  sourcePortProcessorName = sourcePort._processor;
  console.log(`${nodeType} -> ${sourcePortProcessorName}`);
  try {
    funcs[nodeType] &&
      funcs[nodeType][sourcePortProcessorName] &&
      funcs[nodeType][sourcePortProcessorName].call(sourcePort, type, targetPort);
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

function createLineBySourcePort(sourcePort, targetPort) {
  sourcePort._targetPort = targetPort;
  targetPort._sourcePort = sourcePort;
  targetPort._sourceNodeId = sourcePort._nodeId;
  targetPort._sourcePortId = sourcePort._portId;
  let link = new airglass.NodeLine(
    sourcePort,
    targetPort
  )
  link.updatePath();
  link.stroke = `hsla(${sourcePort._node._hue}, 100%, 50%, .3)`;
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
    width: rendererManager.canvasWidth,
    height: rendererManager.canvasHeight,
    hosts: renderers.node.scene.children.map(hostChild => {
      return {
        id: hostChild._id,
        name: hostChild._name,
        type: hostChild._type,
        x: hostChild.x,
        y: hostChild.y,
        width: hostChild._width,
        height: hostChild._height,
        hue: hostChild._hue,
        imports: hostChild.imports.map(importPort => {
          return {
            sourceNodeId: importPort._sourceNodeId,
            sourcePortId: importPort._sourcePortId,
            name: importPort._name,
          }
        }),
        exports: hostChild.exports.map(exportPort => {
          return {
            id: exportPort._portId,
            name: exportPort._name,
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

function getNodeById(nodeId) {
  let node;
  renderers.node.scene.children.forEach(_node => {
    if (nodeId == _node._id) {
      node = _node;
    }
  })
  return node;
}