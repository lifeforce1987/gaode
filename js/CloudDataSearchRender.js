/**
 * Created with WebStorm.
 * Author: qiang.niu(http://www.siptea.cn)
 * Date: 2015/6/30 11:35
 * To change this template use File | Settings | File Templates.
 */
if (typeof(Lib) == "undefined") {
	Lib = {};
}
Lib.AMap = Lib.AMap || {};
Lib.AMap.CloudDataSearchRender = function() {
	var me = this;
	//me.author="qiang.niu(http://www.siptea.cn)";
	me.autoRender = function(options) { //options.map otpions.panel options.data
		me.clear();
		if (!options || !options.methodName || !options.methodArgumments || (!options.panel && !options.map)) {
			return;
		}
		this.options = options;
		this.callback('complete', options['data']);
	}
	me.callback = function(status, result) {
		me.clear();
		var options = me.options;
		if (options.callback) {
			options.callback(status, result);
		}
		if (status != "complete") {
			return;
		}
		me.result = result;
		if (options.map) {
			me._infoWindow = new AMap.InfoWindow({ //点的信息窗体
				size: new AMap.Size(0, 0),
				isCustom: true,
				offset: new AMap.Pixel(0, -30)
			});
			me._overlays = []; //poi
			me._highlightOverlay = null; //高亮poi
			if (result['datas']) {
				me.drawOverlays(result);
			}
			if (options.methodName == "searchNearBy") { //如果是周边查询，画出圆的范围
				var a = me.options.methodArgumments;
				me.drawCircle(a[0], a[1]);
			}
			if (options.methodName == "searchInPolygon") { //如果是多边形，画出多边形
				var a = me.options.methodArgumments;
				me.drawPolygon(a[0]);
			}

		}
		if (options.panel) {
			if (Object.prototype.toString.call(options.panel) == '[object String]') {
				options.panel = document.getElementById(options.panel);
			}
			options.panel.innerHTML = me.view.createPanel(result);
				
			me.enableListeners();
		}
	}
	me.clear = function() {
		this.clearPanel();
		this.clearOverlays();
		this.clearCircle();
		this.clearPolygon();
	};
	me.drawOverlays = function(result) { //绘制本页所有的点
		me.clearOverlays();
		var pois = result.datas;

		me._overlays = this.addOverlays(pois);

		me.options.map.setFitView(this._overlays);
	}
	me.addOverlays = function(points) {
		var map = this.options.map;
		var _overlays = [];
		for (var i = 0, point; i < points.length; i++) { //绘制途经点
			point = new AMap.Marker({
				map: map,
				topWhenClick: true,
				position: points[i]._location, //基点位置
				content: '<div class="amap_lib_cloudDataSearch_poi">' + (i + 1) + '</div>'
			});
			points[i].index = i;
			point._data = points[i];
			AMap.event.addListener(point, "click", this.listener.markerClick);
			_overlays.push(point);
		}
		return _overlays;
	}
	me.clearPanel = function() {
		if (this.options && this.options.panel) {
			this.options.panel.innerHTML = '';
		}
	}
	me.clearOverlays = function() {
		if (this._overlays) {
			for (var i = 0, overlay; i < this._overlays.length; i++) {
				overlay = this._overlays[i];
				overlay.setMap(null);
			}
			this._overlays = [];
		}
		if (this._infoWindow) {
			this._infoWindow.close();
		}
	}
	me.setCenter = function(index) {
		var poi = me.result.datas[index];
		poi.index = index;
		me.options.map.setCenter(poi._location);
		me._overlays[index].setTop(true);
		me.listener.markerClick.call({
			_data: poi,
			getPosition: function() {
				return poi._location;
			}
		});
	}
	me.util = {};
	/**
	 * 根据类名获得元素
	 * 参数说明:
	 *      1、className 类名
	 *      2、tag 元素名 默认所有元素
	 *      3、parent 父元素 默认doucment
	 */
	me.util.getElementsByClassName = function(className, tag, parent) {
		var testClass = new RegExp("(^|\\s)" + className + "(\\s|$)");
		//var testClass = new RegExp("(\w|\s)*" + className + "(\w|\s)*");
		var tag = tag || "*";
		var parent = parent || document;
		var elements = parent.getElementsByTagName(tag);
		var returnElements = [];
		for (var i = 0, current; i < elements.length; i++) {
			current = elements[i];
			if (testClass.test(current.className)) {
				returnElements.push(current);
			}
		}
		return returnElements;
	}
	me.enableListeners = function() { //注册面板条目点击事件
		var unfocusTitles = me.util.getElementsByClassName("poibox", "*", me.options.panel);
		for (var i = 0, unfocusTitle; i < unfocusTitles.length; i++) {
			unfocusTitle = unfocusTitles[i];
			AMap.event.addDomListener(unfocusTitle, "click", this.listener.unfocusTitleClick); //poi点击事件
		}

		var pageLinks = me.util.getElementsByClassName("pageLink", "*", me.options.panel);
		for (var i = 0, pageLink; i < pageLinks.length; i++) {
			pageLink = pageLinks[i];
			AMap.event.addDomListener(pageLink, "click", me.listener.toPage); //poi点击事件
		}
	}
	me.listener = {};
	me.listener.markerClick = function() {
		var data = this._data;
		me._infoWindow.setContent(me.view.createInfowindowContent(data));
		me._infoWindow.open(me.options.map, this.getPosition());

		me.options.map.setCenter(this.getPosition());
	}
	me.listener.unfocusTitleClick = function() { //点击poi面板条目时，负责把此poi移到地图中央，并且打开其信息窗体
		if (me.last) {
			me.last.className = "poibox";
		}
		me._currentDiv = this;
		var index;
		var children = this.parentNode.children;
		for (var i = 0, child; i < children.length; i++) {
			child = children[i];
			if (child === this) {
				index = i;
				break;
			}
		}
		me._currentIndex = index; //记录当前poi索引号

		var div = me._currentDiv;
		div.className = "poibox active";
		me.last = div;

		if (me.options.map) {
			me.setCenter(me._currentIndex);
		}

	}
	me.listener.toPage = function() {
		var pageNo = this.getAttribute("pageNo");
		me.toPage(pageNo);
	}
	me.toPage = function(pageNo) {
		if (pageNo.length) {
			pageNo = parseInt(pageNo);
		}
		me.options.cloudDataSearchInstance.setPageIndex(pageNo);
		me.options.cloudDataSearchInstance[me.options.methodName].apply(me.options.cloudDataSearchInstance, me.options.methodArgumments);
	}
	me.view = {}; //创建dom结构类的方法

	me.view.createInfowindowContent = function(data) { //创建点的infowindow内容
		var content = document.createElement('div');
		var div = document.createElement('div');
		div.className = 'amap-content-body';
		var c = [];
		c.push('<div class="amap-lib-infowindow">');
		c.push('    <div class="amap-lib-infowindow-title">' + (data.index + 1) + '.' + data._name + '</div>');
		c.push('    <div class="amap-lib-infowindow-content">');
		c.push('        <div class="amap-lib-infowindow-content-wrap">');
		c.push('             <div>地址：' + data._address + '</div>');
		c.push('             <div>类型：' + data.type + '</div>');
		if (data._image && data._image.length) {
			c.push('         <img style = "margin-top:5px;width:100%;height:100px" src="' + data['_image'][0]['_preurl'] + '""></img>');
		}
		c.push('        </div>');
		c.push('    </div>');
		c.push('</div>');
		div.innerHTML = c.join('');

		var sharp = document.createElement('div');
		sharp.className = 'amap-combo-sharp';
		div.appendChild(sharp);

		var close = document.createElement('div');
		close.className = 'amap-combo-close';
		div.appendChild(close);
		close.href = 'javascript: void(0)';

		AMap.event.addDomListener(close, 'touchend', function(e) {
			me._infoWindow['close']();
		}, this);
		AMap.event.addDomListener(close, 'click', function(e) {
			me._infoWindow['close']();
		}, this);
		content.appendChild(div);
		content.appendChild(close);
		content.appendChild(sharp);
		return content;
	}
	me.view.createPanel = function(result) { //根据服务插件Amap.CloudDataSearch的返回结果，生成panel
		if (result.info == "OK" && result.datas && result.datas.length > 0) {

		} else {
			return "<div class='amap_lib_cloudDataSearch'>抱歉，未搜索到有效的结果。</div>";
		}
		var pois = result.datas;
		var c = [];
		c.push("<div class=\"amap_lib_cloudDataSearch\">");
		c.push("    <div class=\"amap_lib_cloudDataSearch_list\">");
		c.push("        <ul>");
		for (var i = 0, poi; i < pois.length; i++) {
			poi = pois[i];
			c.push("            <li class=\"poibox\">");
			c.push("                <div class=\"amap_lib_cloudDataSearch_poi poibox-icon\">" + (i + 1) + "</div>");
			c.push("                <h3 class=\"poi-title\">");
			c.push("                	<span class=\"poi-name\">" + poi._name + "</span>");
			c.push("                </h3>");
			c.push("                <div class=\"poi-info\">");
			c.push("                	<p class=\"poi-addr\">地址：" + poi._address + "</p>");
			c.push("                </div>");
			c.push("            </li>");
		}
		c.push("        </ul>");
		c.push("    </div>");
		c.push("    <div class=\"amap_lib_cloudDataSearch_page\">");
		c.push("        <div>");
		c.push("            <p>");
		var poiList = result.poiList,
			count = result.count, //493
		/*	pageIndex = me.options.pageIndex ? me.options.pageIndex : 1,
			pageSize = me.options.pageSize ? me.options.pageSize : 500,*/
		/*
			api中没有公开获取pageIndex,pageSize的方法，在此从临时属性j中获取，api每次升级时这个属性名都会变化
			 */
			pageIndex = me.options.cloudDataSearchInstance.j.pageIndex ? me.options.cloudDataSearchInstance.j.pageIndex : 1,
			pageSize = me.options.cloudDataSearchInstance.j.pageSize ? me.options.cloudDataSearchInstance.j.pageSize : 500,
			pageCount = Math.ceil(count / pageSize);
		if (pageIndex > 3) {
			c.push(me.view.createPageButton(1, "首页"));
		}
		if (pageIndex > 1) {
			c.push(me.view.createPageButton(pageIndex - 1, "上一页"));
		}
		if (pageIndex - 2 >= 1) {
			c.push(me.view.createPageButton(pageIndex - 2, pageIndex - 2));
		}
		if (pageIndex - 1 >= 1) {
			c.push(me.view.createPageButton(pageIndex - 1, pageIndex - 1));
		}
		c.push("                <span>" + pageIndex + "</span>");
		if (pageIndex + 1 <= pageCount) {
			c.push(me.view.createPageButton(pageIndex + 1, pageIndex + 1));
		}
		if (pageIndex + 2 <= pageCount) {
			c.push(me.view.createPageButton(pageIndex + 2, pageIndex + 2));
		}
		if (pageIndex < pageCount) {
			c.push(me.view.createPageButton(pageIndex + 1, "下一页"));
		}
		c.push("            </p>");
		c.push("        </div>");
		c.push("    </div>");
		c.push("</div>");
		return c.join("");
	}

	var circleOptions = {
		id: 'cloudData-search-circle',
		radius: 3000,
		strokeColor: '#72ccff',
		strokeOpacity: .7,
		strokeWeight: 1,
		fillColor: '#d0e7f8',
		fillOpacity: .5
	};

	me.drawCircle = function(center, radius) { //为周边查询画圆
		me.clearCircle();

		circleOptions.map = me.options.map;
		circleOptions.center = center;
		circleOptions.radius = radius;

		me.searchCircle = new AMap.Circle(circleOptions);
	};

	me.clearCircle = function() {
		if (me.searchCircle) {
			me.searchCircle.setMap(null);
			me.searchCircle = null;
		}
	};

	var polygonOptions = {
		id: 'cloudData-search-bound',
		strokeColor: '#72ccff',
		strokeOpacity: .7,
		strokeWeight: 1,
		fillColor: '#d0e7f8',
		fillOpacity: .2
	};
	me.drawPolygon = function(polygon) { //为多边形查画多边形
		me.clearPolygon();
		polygonOptions.path = polygon;
		polygonOptions.map = me.options.map;
		var polygon = new AMap.Polygon(polygonOptions);

		me.searchPolygon = polygon;
	};

	me.clearPolygon = function() {
		if (me.searchPolygon) {
			me.searchPolygon.setMap(null);
			me.searchPolygon = null;
		}
	};

	me.view.createPageButton = function(pageNum, text) {
		//return "<span><a pageNo=" + pageNum + " class=\"pageLink\" href=\"javascript:void(0)\">" + text + "</a></span>";
		return "<span><a pageNo=" + pageNum + " class=\"pageLink\" >" + text + "</a></span>";
	}
}