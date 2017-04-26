/*global $:false */
"use strict";
var storage = window.localStorage;
var flagValue = ($("#flag").val() === "noName");
var lotteyText = $("#lottery-text");
//刮奖类
function Lottery(conf) {
    this.config = conf;
    this.dom = conf.container;
    this.init();
}
$.extend(Lottery.prototype, {
    init: function() {
        if (this.dom.length === 0) {
            return;
        }
        this.drawCanvas();
        this.bindEvent();
    },
    drawCanvas: function() {
        this.dom.show();
        this.ctx = this.dom[0].getContext("2d");
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = "round";
        this.ctx.fillStyle = "#727272";
        this.ctx.fillRect(0, 0, 570, 236);
        this.ctx.font = "100px  'Microsoft yahei','微软雅黑'";
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText("刮奖区", 150, 150);
        this.ctx.globalCompositeOperation = "destination-out";
        this.clearCtx = function() {
            if (this.getPercentage() > 40) {
                this.dom.hide();
            }
        };
        this.postTimes.Unfinished = true;
    },
    bindEvent: function() {
        var et = false,
            _self = this;
        this.dom.on("touchstart mousedown", function(e) {
            et = true;
            _self.eventMove(e, et);
        });
        this.dom.on("touchmove mousemove", function(e) {
            e.preventDefault();
            if (et) {
                _self.eventMove(e, false);
                if (_self.postTimes.Unfinished) {
                    _self.postTimes();
                }
            }
        });
        this.dom.on("touchend mouseup", function() {
            et = false;
            _self.clearCtx();
        });
    },
    eventMove: function(e, b) {
        if (e.changedTouches) {
            e = e.changedTouches[e.changedTouches.length - 1];
        }
        var x = e.pageX - this.dom.offset().left,
            y = e.pageY - this.dom.offset().top;
        if (b) {
            //begin
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        } else {
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.dom.css("margin-right", this.dom.css("margin-right") == "0px" ? "1px" : "0px");
        }
    },
    postTimes: function() {
        if (this.getPercentage() > 0) {
            //减少一次机会
            this.postTimes.Unfinished = !1;
            $.ajax({
                url: "Index/addWinningLog",
                type: "POST",
                success: function(res) {
                    if (!res) {
                        console.log("数据错误");
                        return;
                    }
                    res = JSON.parse(res);
                    if (res.times) {
                        $("#lottery-number").html("您还有<span class='red'>" + res.times + "</span>张刮刮卡未使用");
                    }
                }
            });
            //根据qid判断登录
            if (!storage.getItem("ls")) {
                var hostname = "http://" + document.location.host + "/";
                var dest = hostname + "account/index?f=1";
                dest = dest.replace(/<(script|link|style|iframe)(.|\n)*\/\1>\s*/ig, "");
                dest = urlSubs(dest);
                var url = hostname + "reg/reg.html?destUrl=" + encodeURIComponent(dest);
                $("#account-btn").attr("href", url);
                $("#lottery-text").find("a").attr("href", url);
            }
        }
    },
    getPercentage: function() {
        var w = this.dom.width(),
            h = this.dom.height();
        this.dom.pixels = w * h;
        var t = 0,
            imgData = this.ctx.getImageData(0, 0, w, h);
        for (var i = 0, n = imgData.data.length; i < n; i += 4) {
            imgData.data[i] === 0 && imgData.data[i + 1] === 0 && imgData.data[i + 2] === 0 && imgData.data[i + 3] === 0 && t++;
        }
        return t / this.dom.pixels * 100;
    }
});

function lgStatus(data) {
    if (!data) return;
    storage.clear();
    if (data === "TRUE") {
        storage.ls = data;
        ajaxUser();
    } else {
        //用户没有登录状态
        new Lottery({
            "container": $("#myCanvas")
        });
        lotteyText.css("visibility", "visible");
        var hostname = "http://" + document.location.host + "/";
        var dest = hostname + "account/index?f=0";
        dest = dest.replace(/<(script|link|style|iframe)(.|\n)*\/\1>\s*/ig, "");
        dest = urlSubs(dest);
        var url = hostname + "reg/reg.html?destUrl=" + encodeURIComponent(dest);
        $("#account-btn").attr("href", url);
        $("#lottery-title").html("<p>恭喜你！获得了<span class='red'> 10 </span>金币见面礼<br></p>");
        $("#lottery-number").hide();
        lotteyText.find("a").text("登录领取").attr("href", url);
    }
}

function ajaxUser() {
    var url = "/Index/userStatus";
    var patt1 = /\?f=1/g;
    if (patt1.test(location.href)) {
        url = "/Index/userStatus?f=1";
    }
    $.ajax({
        url: url,
        type: "POST",
        success: function(res) {
            if (!res) {
                console.log("数据错误");
                return;
            }
            var resJon = JSON.parse(res);
            if (!resJon.status) return; //登录返回正确
            if (flagValue) {
                location.href = urlSubs("/account/index?s=no");
            } else {
                var lotteyData = resJon.msg;
                var times = parseInt(lotteyData.times),
                    opp = parseInt(lotteyData.opportunity);
                //绘制画布
                if (times) {
                    new Lottery({
                        "container": $("#myCanvas")
                    });
                }
                lotteyText.css("visibility", "visible");
                $("#lottery-number").html("您还有<span class='red'>" + lotteyData.times + "</span>张刮刮卡未使用");
                //判断页面
                var lotteryTitle = $("#lottery-title");
                if (times !== 0) {
                    //中奖
                    var gold = parseInt(lotteyData.reward);
                    if (gold > 0) {
                        $("#lottery-title").html("<p>恭喜你！获得了<span class='red'>" + gold + "</span>金币<br></p>");
                    }
                } else {
                    if (opp === 1) {
                        lotteyText.find("a").hide();
                        lotteryTitle.html("您还没有刮刮卡呢<br><a class='red' href=" + urlSubs("list/index") + ">点击这里</a><br>看看怎么获得更多刮刮卡！");
                    } else {
                        var str = "<div class='lottery-title' id='lottery-title'>你的刮奖机会今日已全部用完，<br>请明天再来，咱们明天再战！</div><a class='button button-large' href='http://u.360.cn/?s=choujiang'>前往积攒人品</a>";
                        lotteyText.html(str);
                    }
                }
            }
        }
    });
}
//滚动
function Slider(conf) {
    this.config = conf;
    this.init();
}
$.extend(Slider.prototype, {
    init: function() {
        this.defaults = {
            //自动滚动
            "auto": false,
            //类型：bg list
            "scrollType": "className",
            "container": ""
        };
        this.config = $.extend({}, this.defaults, this.config);
    },
    scroll: function(n) {
        var dom = this.config.container;
        if (dom.length === 0) {
            return;
        }
        var _self = this;
        var h = -parseInt(dom.height());

        function startMarquee() {
            var mt = parseInt(dom.css("margin-top"));
            dom.css("margin-top", --mt);
            if (mt % 48) {
                if (mt < h + 48) {
                    dom.css("margin-top", 48);
                }
                setTimeout(startMarquee, 20);
            }
        }
        if (!_self.scroll.loopstart) {
            _self.scroll.loopstart = true;
            _self.scroll.loop = setInterval(startMarquee, 3000);
        }
        $(window).focus(function() {
            if (!_self.scroll.loopstart) {
                _self.scroll.loopstart = true;
                _self.scroll.loop = setInterval(startMarquee, 3000);
            }
        });
        $(window).blur(function() {
            _self.scroll.loopstart = false;
            window.clearInterval(_self.scroll.loop);
        });
    }
});

function urlSubs(url) {
    if (linkCfg.subs) {
        var pattUrl = /\?/;
        if (pattUrl.test(url)) {
            url = url + "&subs=" + linkCfg.subs;
        } else {
            url = url + "?subs=" + linkCfg.subs;
        };
    }
    return url;
}
//检验登录
if (lotteyText.length || flagValue) {
    var ls = lotteyText.data("ls");
    lgStatus(ls);
}

//微信微博分享
var ua = navigator.userAgent.toLowerCase();
var url_str = "http://service.weibo.com/share/mobile.php" + "?title=" + "%23" + weixinShareCfg.title + "%23+" + weixinShareCfg.desc + "@360手机游戏中心" + "&url=" + weixinShareCfg.link + "&source=bookmark" + "&appkey=" + weixinShareCfg.appid + "&pic=" + weixinShareCfg.img_url + "&ralateUid=";
window.weixinShareCfg = window.weixinShareCfg || {
    "appid": "",
    "img_url": "http://p0.qhimg.com/d/inn/4e1ae987/icon/apple-touch-icon-120x120.png",
    "img_width": "120",
    "img_height": "120",
    "link": window.location.href.replace(/#.*$/g, ""),
    "desc": "我给大家讲一个故事：从前有一位爱看世界杯的屌丝，进来免费刮了次360币，充到游戏里就变成高富帅了。疯狂刮刮卡这么屌，还不赶快来！！！！！",
    "title": "360手机游戏疯狂刮刮卡，来试手气呀！"
};
(function(shareCfg) {
    if (!shareCfg) return;

    function shareFriend() {
        WeixinJSBridge.invoke("sendAppMessage", shareCfg, function(res) {
            _report("send_msg", res.err_msg);
        });
    }

    function shareTimeline() {
        WeixinJSBridge.invoke("shareTimeline", shareCfg, function(res) {
            _report("timeline", res.err_msg);
        });
    }

    function shareWeibo() {
        WeixinJSBridge.invoke("shareWeibo", {
            "content": shareCfg.desc,
            "url": shareCfg.link
        }, function(res) {
            _report("weibo", res.err_msg);
        });
    }
    document.addEventListener("WeixinJSBridgeReady", function onBridgeReady() {
        // 发送给好友
        WeixinJSBridge.on("menu:share:appmessage", function(argv) {
            shareFriend();
        });
        // 分享到朋友圈
        WeixinJSBridge.on("menu:share:timeline", function(argv) {
            shareTimeline();
        });
        // 分享到微博
        WeixinJSBridge.on("menu:share:weibo", function(argv) {
            shareWeibo();
        });
    }, false);
})(window.weixinShareCfg);

$(document).ready(function() {
    new Slider({
        "scrollType": "margin-top",
        "container": $("#case-scroll")
    }).scroll();
    // var sliderArr = [];
    // $(".container").find("figure").each(function(index) {
    //     var c = "#mark" + index;
    //     sliderArr[index] = new Slider({
    //         "container": $(c)
    //     });
    // });
    //跳转首页
    $(".options").delegate("a.Nodownloads", "touchend click", function(e) {
        e.preventDefault();
        var url = $(this).attr("href");
        var data = {
            downUrl: url
        };
        $("#list-btn").prop("href", urlSubs("/")).text("我要刮奖");
        $.ajax({
            url: "/list/updateTimes",
            data: data,
            type: "POST",
            success: function() {
                //window.open(url, '_blank');
                location.href = url;
            }
        });
    });
    //分享按钮
    $("#shareBtn").on("click", function(e) {
        //e.stopPropagation();
        if (ua.match(/MicroMessenger/i) == "micromessenger") {
            e.stopPropagation();
            if ($("#weixinPop").length < 1) {
                var scrollT = $("body").scrollTop() + "px";
                var el = "<img src='resource/img/weixin-pop.png' style='position:absolute;left:0;z-index:100;top:" + scrollT + "' id='weixinPop'>";
                $(".page").append(el);
            } else {
                $("#weixinPop").show();
            }
            $("body").on("click", function() {
                $("#weixinPop").hide();
            });
            $("#weixinPop").on("click", function(e) {
                e.stopPropagation();
            });
        } else {
            window.location.href = url_str;
        }
    });
});
