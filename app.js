var WxParse     = require('components/wxParse/wxParse.js');
var util = require('utils/util.js');

App({
  onLaunch: function () {
    var userInfo;
    if(userInfo = wx.getStorageSync('userInfo')){
      this.globalData.userInfo = userInfo;
    }
    this.getSystemInfo();
  },
  firstLoad: true,
  onShow: function(){
    if (this.firstLoad) {
      this.firstLoad = false;
    } else {
      let currentPage = this.getAppCurrentPage(),
          pageRouter = currentPage.page_router || currentPage.router.match(/\/([\d\D]*)\//)[1];

      this.turnToPage('/pages/'+pageRouter+'/'+pageRouter, 1);
    }
  },
  getSystemInfo : function() {
    var that = this;
    wx.getSystemInfo({
      success: function(res) {
        that.systemInfo = res;
      }
    });
  },
  sendRequest: function(param, customSiteUrl){
    var that = this,
        data = param.data || {},
        header = param.header,
        requestUrl;

    if(data.app_id){
      data._app_id = data.app_id;
    } else {
      data._app_id = data.app_id = this.getAppId();
    }
    // data._app_id = this.getAppId();
    // data.app_id = this.getAppId();
    if(!this.globalData.notBindXcxAppId){
      data.session_key = this.getSessionKey();
    }

    if(customSiteUrl) {
      requestUrl = customSiteUrl + param.url;
    } else {
      requestUrl = this.globalData.siteBaseUrl + param.url;
    }

    if(param.method){
      if(param.method.toLowerCase() == 'post'){
        data = this.modifyPostParam(data);
        header = header || {
          'content-type': 'application/x-www-form-urlencoded;'
        }
      }
      param.method = param.method.toUpperCase();
    }

    if(!param.hideLoading){
      this.showToast({
        title: '请求中...',
        icon: 'loading'
      });
    }
    wx.request({
      url: requestUrl,
      data: data,
      method: param.method || 'GET',
      header: header || {
        'content-type': 'application/json'
      },
      success: function(res) {
        if(res.statusCode && res.statusCode != 200){
          that.hideToast();
          that.showModal({
            content: ''+res.errMsg
          });
          typeof param.successStatusAbnormal == 'function' && param.successStatusAbnormal();
          return;
        }
        if(res.data.status){
          if(res.data.status == 401 || res.data.status == 2){
          // 未登录
            that.login();
            typeof param.successStatusAbnormal == 'function' && param.successStatusAbnormal();
            return;
          }
          if(res.data.status != 0){
            typeof param.successStatusAbnormal == 'function' && param.successStatusAbnormal();
            that.hideToast();
            that.showModal({
              content: ''+res.data.data
            });
            return;
          }
        }
        typeof param.success == 'function' && param.success(res.data);
      },
      fail: function(res){
        that.hideToast();
        that.showModal({
          content: '请求失败 '+res.errMsg
        })
        typeof param.fail == 'function' && param.fail(res.data);
      },
      complete: function(res){
        // wx.hideLoading();
        param.hideLoading || that.hideToast();
        typeof param.complete == 'function' && param.complete(res.data);
      }
    });
  },
  turnToPage: function(url, isRedirect){
    var tabBarPagePathArr = this.getTabPagePathArr();
    // tabBar中的页面改用switchTab跳转
    if(tabBarPagePathArr.indexOf(url) != -1) {
      this.switchToTab(url);
      return;
    }
    if(!isRedirect){
      wx.navigateTo({
        url: url
      });
    } else {
      wx.redirectTo({
        url: url
      });
    }
  },
  tapPrevewPictureHandler:function(e){
    this.previewImage({
      urls: e.currentTarget.dataset.imgarr instanceof Array ? e.currentTarget.dataset.imgarr : [e.currentTarget.dataset.imgarr],
    })
  },
  switchToTab: function(url){
    wx.switchTab({
      url: url
    });
  },
  turnBack: function(options){
    wx.navigateBack({
      delta: options ? (options.delta || 1) : 1
    });
  },
  setPageTitle: function(title){
    wx.setNavigationBarTitle({
      title: title
    });
  },
  showToast: function(param){
    wx.showToast({
      title: param.title,
      icon: param.icon,
      duration: param.duration || 1500,
      success: function(res){
        typeof param.success == 'function' && param.success(res);
      },
      fail: function(res){
        typeof param.fail == 'function' && param.fail(res);
      },
      complete: function(res){
        typeof param.complete == 'function' && param.complete(res);
      }
    })
  },
  hideToast: function(){
    wx.hideToast();
  },
  showModal: function(param){
    wx.showModal({
      title: param.title || '提示',
      content: param.content,
      showCancel: param.showCancel || false,
      cancelText: param.cancelText || '取消',
      cancelColor: param.cancelColor || '#000000',
      confirmText: param.confirmText || '确定',
      confirmColor: param.confirmColor || '#3CC51F',
      success: function(res) {
        if (res.confirm) {
          typeof param.confirm == 'function' && param.confirm(res);
        } else {
          typeof param.cancel == 'function' && param.cancel(res);
        }
      },
      fail: function(res){
        typeof param.fail == 'function' && param.fail(res);
      },
      complete: function(res){
        typeof param.complete == 'function' && param.complete(res);
      }
    })
  },
  chooseVideo: function(callback, maxDuration){
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: maxDuration || 60,
      camera: ['front', 'back'],
      success: function (res) {
        typeof callback == 'function' && callback(res.tempFilePaths[0]);
      }
    })
  },
  chooseImage: function(callback, count){
    var that = this;
    wx.chooseImage({
      count: count || 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempFilePaths = res.tempFilePaths,
            imageUrls = [];

        that.showToast({
          title: '提交中...',
          icon: 'loading',
          duration: 10000
        });
        for (var i = 0; i < tempFilePaths.length; i++) {
          wx.uploadFile({
            url : that.globalData.siteBaseUrl+ '/index.php?r=AppData/uploadImg',
            filePath: tempFilePaths[i],
            name: 'img_data',
            success: function(res){
              var data = JSON.parse(res.data);
              if(data.status == 0){
                imageUrls.push(data.data);
                if(imageUrls.length == tempFilePaths.length){
                  that.hideToast();
                  typeof callback == 'function' && callback(imageUrls);
                }
              } else {
                that.showModal({
                  content: data.data
                })
              }
            },
            fail: function(res){
              console.log(res.errMsg);
            },
            complete: function(){
              that.hideToast();
            }
          })
        }

      }
    })
  },
  previewImage: function(options){
    wx.previewImage({
      current: options.current || '',
      urls: options.urls || [options.current]
    })
  },
  playVoice: function(filePath){
    wx.playVoice({
      filePath: filePath
    });
  },
  pauseVoice: function(){
    wx.pauseVoice();
  },
  // 统计用户分享
  countUserShareApp: function(){
    this.sendRequest({
      url: '/index.php?r=AppShop/UserShareApp'
    });
  },
  shareAppMessage: function(options){
    var that = this;
    return {
      title: options.title || this.getAppTitle() || '即速应用',
      desc: options.desc || this.getAppDescription() || '即速应用，拖拽生成app，无需编辑代码，一键打包微信小程序',
      path: options.path,
      success: function(){
        // 统计用户分享
        that.countUserShareApp();
      }
    }
  },

  // 调用微信支付接口
  wxPay: function(param){
    var _this = this;
    wx.requestPayment({
      'timeStamp': param.timeStamp,
      'nonceStr': param.nonceStr,
      'package': param.package,
      'signType': 'MD5',
      'paySign': param.paySign,
      success: function(res){
        _this.wxPaySuccess(param);
        typeof param.success === 'function' && param.success();
      },
      fail: function(res){
        if(res.errMsg === 'requestPayment:fail cancel'){
          typeof param.fail === 'function' && param.fail();
          return;
        }
        if(res.errMsg === 'requestPayment:fail'){
          res.errMsg = '支付失败';
        }
        _this.showModal({
          content: res.errMsg
        })
        _this.wxPayFail(param, res.errMsg);
        typeof param.fail === 'function' && param.fail();
      }
    })
  },
  wxPaySuccess: function(param){
    var orderId = param.orderId,
        goodsType = param.goodsType,
        formId = param.package.substr(10),
        t_num = goodsType == 1 ? 'AT0104':'AT0009';

    this.sendRequest({
      hideLoading: true,
      url: '/index.php?r=AppShop/SendXcxOrderCompleteMsg',
      data: {
        formId: formId,
        t_num: t_num,
        order_id: orderId
      }
    })
  },
  wxPayFail: function(param, errMsg){
    var orderId = param.orderId,
        formId = param.package.substr(10);

    this.sendRequest({
      hideLoading: true,
      url: '/index.php?r=AppShop/SendXcxOrderCompleteMsg',
      data: {
        formId: formId,
        t_num: 'AT0010',
        order_id: orderId,
        fail_reason: errMsg
      }
    })
  },
  // 拨打电话
  makePhoneCall: function(number, callback){
    if(number.currentTarget){
      var dataset = number.currentTarget.dataset;

      number = dataset.number;
    }
    wx.makePhoneCall({
      phoneNumber: number,
      success: callback
    })
  },
  // 获取地理位置
  getLocation: function(options){
    wx.getLocation({
      type: 'wgs84',
      success: options.success,
      fail: options.fail
    })
  },
  // 选择地图上位置
  chooseLocation: function(options){
    wx.chooseLocation({
      success: function(res){
        console.log(res);
        options.success(res);
      },
      cancel: options.cancel,
      fail: options.fail
    });
  },
  openLocation: function(options){
    wx.openLocation(options);
  },
  setClipboardData: function(options){
    wx.setClipboardData({
      data: options.data || '',
      success: options.success,
      fail: options.fail,
      complete: options.complete
    })
  },
  getClipboardData: function(options){
    wx.getClipboardData({
      success: options.success,
      fail: options.fail,
      complete: options.complete
    })
  },
  showShareMenu: function(options){
    options = options || {};
    wx.showShareMenu({
      withShareTicket: options.withShareTicket || false,
      success: options.success,
      fail: options.fail,
      complete: options.complete
    });
  },
  scanCode: function(options){
    options = options || {};
    wx.scanCode({
      onlyFromCamera: options.onlyFromCamera || false,
      success: options.success,
      fail: options.fail,
      complete: options.complete
    })
  },

  // 登录微信
  login: function(){
    var that = this;

    wx.login({
      success: function(res){
        if (res.code) {
          that.sendCode(res.code);
        } else {
          console.log('获取用户登录态失败！' + res.errMsg)
        }
      },
      fail: function(res){
        console.log('login fail: '+res.errMsg);
      }
    })
  },
  checkLogin: function(){
    if(!this.getSessionKey()){
      this.sendSessionKey();
    } else {
      this.pageInitial();
    }
  },
  pageInitial: function(){
    this.getAppCurrentPage().dataInitial();
  },
  // 向服务器发送微信登录返回的code
  sendCode: function(code){
    var that = this;
    this.sendRequest({
      url: '/index.php?r=AppUser/onLogin',
      data: {
        code: code
      },
      success: function(res){
        if(res.is_login == 2) {
          that.globalData.notBindXcxAppId = true;
        }
        that.setSessionKey(res.data);
        that.requestUserInfo(res.is_login);
        that.pageInitial();
      },
      fail: function(res){
        console.log('sendCode fail');
      },
      complete: function(res){

      }
    })
  },
  sendSessionKey: function(){
    var that = this;
    try {
      var key = wx.getStorageSync('session_key');
    } catch(e) {

    }

    if (!key) {
      console.log("check login key=====");
      this.login();

    } else {
      this.globalData.sessionKey = key;
      this.sendRequest({
        url: '/index.php?r=AppUser/onLogin',
        success: function(res){
          if(!res.is_login){
            // 如果没有登录
            that.login();
            return;
          } else if(res.is_login == 2) {
            that.globalData.notBindXcxAppId = true;
          }
          that.requestUserInfo(res.is_login);
          that.pageInitial();
        },
        fail: function(res){
          console.log('sendSessionKey fail');
        }
      });
    }
  },
  requestUserInfo: function(is_login){
    if(is_login==1){
      this.requestUserXcxInfo();
    } else {
      this.requestUserWxInfo();
    }
  },
  requestUserXcxInfo: function(){
    var that = this;
    this.sendRequest({
      url: '/index.php?r=AppData/getXcxUserInfo',
      success: function(res){
        if(res.status == 0){
          if(res.data){
            that.setUserInfoStorage(res.data);
          }
        }
      },
      fail: function(res){
        console.log('requestUserXcxInfo fail');
      }
    })
  },
  requestUserWxInfo: function(){
    var that = this;
    wx.getUserInfo({
      success: function(res){
        that.sendUserInfo(res.userInfo);
      },
      fail: function(res){
        console.log('requestUserWxInfo fail');
      }
    })
  },
  sendUserInfo: function(userInfo){
    var that = this;
    this.sendRequest({
      url: '/index.php?r=AppUser/LoginUser',
      method: 'post',
      data: {
        nickname: userInfo['nickName'],
        gender: userInfo['gender'],
        city: userInfo['city'],
        province: userInfo['province'],
        country: userInfo['country'],
        avatarUrl: userInfo['avatarUrl']
      },
      success: function(res){
        if(res.status == 0){
          that.setUserInfoStorage(res.data.user_info);
        }
      },
      fail: function(res){
        console.log('requestUserXcxInfo fail');
      }
    })
  },
  // checkIfBindPhone: function(){
  //   if(!this.getUserInfo().phone) {
  //     this.turnToPage('/pages/bindCellphone/bindCellphone', true);
  //   }
  // },
  
  //将页面滚动到目标位置（单位px）。
  pageScrollTo : function( scrollTop ) {
    if (wx.pageScrollTo) {
      wx.pageScrollTo({
        scrollTop: scrollTop
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
      });
    }
  },

  dataInitial: function(){
    var _this = this,
        pageInstance = this.getAppCurrentPage(),
        pageRequestNum = pageInstance.requestNum,
        newdata = {};

    if (!!pageInstance.dataId && !!pageInstance.page_form) {
      var dataid = parseInt(pageInstance.dataId);
      var param = {};

      param.data_id = dataid;
      param.form = pageInstance.page_form;

      pageInstance.requestNum = pageRequestNum + 1;
      _this.sendRequest({
        hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
        url: '/index.php?r=AppData/getFormData',
        data: param,
        method: 'post',
        success: function (res) {
          if (res.status == 0) {
            newdata = {};
            newdata['detail_data'] = res.data[0].form_data;

            for (let i in newdata['detail_data']) {
              if (i == 'category') {
                continue;
              }

              let description = newdata['detail_data'][i];
              if (!description) {
                continue;
              }
              // 检测如果不是一个图片链接的话就解析
              if(typeof description == 'string' && !/^http:\/\/img/g.test(description)){
                newdata['detail_data'][i] = _this.getWxParseResult(description);
              }
            }
            pageInstance.setData(newdata);

            if (!!pageInstance.dynamicVesselComps) { // 处理动态容器请求
              for (let i in pageInstance.dynamicVesselComps) {
                let vessel_param = pageInstance.dynamicVesselComps[i].param;
                let compid = pageInstance.dynamicVesselComps[i].compid;
                if (!!newdata.detail_data[vessel_param.param_segment]) {
                  vessel_param.idx = vessel_param.search_segment;
                  vessel_param.idx_value = newdata.detail_data[vessel_param.param_segment];
                  if(!(typeof vessel_param.idx_value == 'string')){
                    let iv = vessel_param.idx_value[0];
                    if( iv == ''){
                      vessel_param.idx_value = '';
                    }else{
                      vessel_param.idx_value = iv.text;
                    }
                  }
                  pageInstance.requestNum = pageRequestNum + 1;
                  _this.sendRequest({
                    hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
                    url: '/index.php?r=AppData/getFormDataList&idx_arr[idx]=' + vessel_param.idx + "&idx_arr[idx_value]=" + vessel_param.idx_value,
                    data: {
                      app_id: vessel_param.app_id,
                      form: vessel_param.form,
                      page: 1
                    },
                    method: 'post',
                    success: function(res) {
                      if (res.status == 0) {
                        let newDynamicData = {};
                        newDynamicData['dynamic_vessel_data_' + compid] = res.data[0];
                        pageInstance.setData(newDynamicData);
                      } else {
                      }
                    },
                    fail: function() {
                      console.log("[fail info]dynamic-vessel data request  failed");
                    }
                  });
                }
              }
            }
          }
        },
        complete: function(){
          pageInstance.setData({
            page_hidden: false
          });
        }
      })
    } else {
      pageInstance.setData({
        page_hidden: false
      });
    }

    if (!!pageInstance.carouselGroupidsParams) {
      for (let i in pageInstance.carouselGroupidsParams) {
        let compid = pageInstance.carouselGroupidsParams[i].compid;
        let carouselgroupId = pageInstance.carouselGroupidsParams[i].carouselgroupId;
        let url = '/index.php?r=AppExtensionInfo/carouselPhotoProjiect';

        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: url,
          data: {
            type: carouselgroupId
          },
          method: 'post',
          success: function (res) {
            if (res.status == 0) {
              newdata = {};
              if (res.data.length) {
                let content = [];
                for (let j in res.data) {
                  let form_data = JSON.parse(res.data[j].form_data);
                  if (form_data.isShow == 1) {
                    let eventParams = {};
                    let eventHandler = "";
                    switch (form_data.action) {
                      case "goods-trade":
                        eventHandler = "tapGoodsTradeHandler";
                        eventParams = '{"goods_id":"' + form_data['goods-id'] + '","goods_type":"' + form_data['goods-type'] + '"}'
                        break;
                      case "inner-link":
                        eventHandler = "tapInnerLinkHandler";
                        let pageLink = form_data['page-link'];
                        if(pageLink == "prePage"){
                          eventParams = '{"inner_page_link":"' + pageLink + '","is_redirect":"0"}';
                        }else {
                          let pageLinkPath = '/pages/'+pageLink+'/'+pageLink;
                          eventParams = '{"inner_page_link":"'+pageLinkPath+'","is_redirect":0}'
                        }
                        break;
                      case "call":
                        eventHandler = "tapPhoneCallHandler";
                        eventParams = '{"phone_num":"' + form_data['phone-num'] + '"}';
                        break;
                      case "get-coupon":
                        eventHandler = "tapGetCouponHandler";
                        eventParams = '{"coupon_id":"' + form_data['coupon-id'] + '"}';
                        break;
                      case "community":
                        eventHandler = "tapCommunityHandler";
                        eventParams = '{"community_id":"' + form_data['community-id'] + '"}';
                        break;
                      case "to-franchisee":
                        eventHandler = "tapToFranchiseeHandler";
                        eventParams = '{"franchisee_id":"' + form_data['franchisee-id'] + '"}';
                        break;
                      default:
                        eventHandler = "";
                        eventParams = "{}";
                    }
                    content.push({
                      "customFeature": [],
                      'page-link': form_data['page-link'],
                      'pic': form_data.pic,
                      "content": "",
                      "parentCompid": "carousel1",
                      "style": "",
                      eventHandler: eventHandler,
                      eventParams: eventParams
                    })
                  }
                }
                console.log(content);
                newdata[compid] = {};
                newdata[compid].type = pageInstance.data[compid].type;
                newdata[compid].style = pageInstance.data[compid].style;
                newdata[compid].content = content;
                newdata[compid].customFeature = pageInstance.data[compid].customFeature;
                newdata[compid].animations = [];
                newdata[compid].page_form = "";
                newdata[compid].compId = compid;

                pageInstance.setData(newdata);
              }
            }
          }
        });
      }
    }


    if (!!pageInstance.list_compids_params) {
      for (let i in pageInstance.list_compids_params) {
        let compid = pageInstance.list_compids_params[i].compid;
        let param = pageInstance.list_compids_params[i].param;
        let url = '/index.php?r=AppData/getFormDataList';

        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: url,
          data: param,
          method: 'post',
          success: function (res) {
            if (res.status == 0) {
              newdata = {};

              if(param.form !== 'form'){ // 动态列表绑定表单则不调用富文本解析
                for (let j in res.data) {
                  for (let k in res.data[j].form_data) {
                    if (k == 'category') {
                      continue;
                    }

                    let description = res.data[j].form_data[k];

                    if (!description) {
                      continue;
                    }
                    // 检测如果不是一个图片链接的话就解析
                    if(typeof description === 'string' && !/^http:\/\/img/g.test(description)){
                      res.data[j].form_data[k] = _this.getWxParseResult(description);
                    }
                  }
                }
              }

              newdata[compid + '.list_data'] = res.data;
              newdata[compid + '.is_more'] = res.is_more;
              newdata[compid + '.curpage'] = 1;

              pageInstance.setData(newdata);
            }
          }
        });
      }
    }

    if (!!pageInstance.goods_compids_params) {
      for (let i in pageInstance.goods_compids_params) {
        let compid = pageInstance.goods_compids_params[i].compid;
        let param = pageInstance.goods_compids_params[i].param;

        if(param.form === 'takeout'){
          param.idx_arr = {
            idx: 'category',
            idx_value: pageInstance.data[compid].content[0].source
          }
        }
        if(param.form === 'tostore'){
          param.page_size = 100;
        }
	pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
	  hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: '/index.php?r=AppShop/GetGoodsList',
          data: param,
          method: 'post',
          success: function (res) {
            if (res.status == 0) {
              newdata = {};
              if(param.form === 'tostore' && res.data.length){
                var arr = [];
                for(var i = 0; i < res.data.length; i++){
                  var data = res.data[i],
                      maxMinArr = [],
                      pri = '';
                  if(data.form_data.goods_model && (data.form_data.goods_model.length >= 2)){
                    for(var j = 0; j < data.form_data.goods_model.length; j++){
                      maxMinArr.push(data.form_data.goods_model[j].price);
                    }
                    if(Math.min.apply(null, maxMinArr) != Math.max.apply(null, maxMinArr)){
                      pri = Math.min.apply(null, maxMinArr).toFixed(2) +'-'+ Math.max.apply(null, maxMinArr).toFixed(2);
                      data.form_data.price = pri;
                    }
                  }
                  arr.push(data);
                }
                if (_this.getHomepageRouter() == pageInstance.page_router) {
                  var second = new Date().getMinutes().toString();
                  if(second.length <= 1){
                    second = '0' + second;
                  }
                  var currentTime = new Date().getHours().toString()+ second,
                      showFlag = true,
                      showTime = '';
		  pageInstance.requestNum = pageRequestNum + 1;
                  _this.sendRequest({
		    hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
                    url: '/index.php?r=AppShop/getBusinessTime',
                    method: 'post',
                    data: {
                      app_id: _this.getAppId()
                    },
                    success: function (res) {
                      var businessTime = res.data.business_time;
                      if (businessTime){
                        for (var i = 0; i < businessTime.length;i++){
                          showTime += businessTime[i].start_time.substring(0, 2) + ':' + businessTime[i].start_time.substring(2, 4) + '-' + businessTime[i].end_time.substring(0, 2) + ':' + businessTime[i].end_time.substring(2, 4) + ' / ';
                          if (+currentTime > +businessTime[i].start_time && +currentTime < +businessTime[i].end_time){
                            showFlag = false;
                          }
                        }
                        if (showFlag){
                          showTime = showTime.substring(0,showTime.length - 2);
                          _this.showModal({
                            content: '店铺休息中,暂时无法接单。营业时间为：' + showTime
                          })
                        }
                      }
                    }
                  });

                }
                newdata[compid + '.goods_data'] = arr;
              }else{
                newdata[compid + '.goods_data'] = res.data;
              }

              if(param.form === 'takeout'){
                var waimaiList = res.data,
                    waimaiDetail = [];

                for (var i = 0; i < waimaiList.length; i++) {
                  var detail = {
                    count: 0,
                    price: +waimaiList[i].form_data.price
                  };
                  waimaiDetail.push(detail);
                  waimaiList[i].form_data.description = _this.getWxParseResult(waimaiList[i].form_data.description);
                }

                newdata[compid + '.waimaiDetail'] = waimaiDetail;
                newdata[compid + '.waimaiTotalNum'] = _this.getWaimaiTotalNum();
                newdata[compid + '.waimaiTotalPrice'] = _this.getWaimaiTotalPrice();
              } else {
                newdata[compid + '.is_more'] = res.is_more;
                newdata[compid + '.curpage'] = 1;
              }

              pageInstance.setData(newdata);
            }
          }
        });
      }
    }

    if (!!pageInstance.franchiseeComps) {
      for (let i in pageInstance.franchiseeComps) {
        let compid = pageInstance.franchiseeComps[i].compid;
        let param = pageInstance.franchiseeComps[i].param;

        _this.getLocation({
          success: function(res){
            var latitude = res.latitude,
                longitude = res.longitude;

            pageInstance.requestNum = pageRequestNum + 1;
            _this.sendRequest({
              hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
              url: '/index.php?r=Region/GetAreaInfoByLatAndLng',
              data: {
                latitude: latitude,
                longitude: longitude
              },
              success: function(res){
                newdata = {};
                newdata[compid + '.location_address'] = res.data.addressComponent.street + res.data.sematic_description;
                pageInstance.setData(newdata);

                param.latitude = latitude;
                param.longitude = longitude;
                _this.setLocationInfo({
                  latitude: latitude,
                  longitude: longitude,
                  address: res.data.addressComponent.street + res.data.sematic_description
                });
                pageInstance.requestNum = pageRequestNum + 1;
                _this.sendRequest({
                  hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
                  url: '/index.php?r=AppShop/GetAppShopByPage',
                  data: param,
                  method: 'post',
                  success: function (res) {
                    // for (let j = 0; j < res.data.length; j++) {
                    //   res.data[j].description = _this.getWxParseResult(res.data[j].description);
                    // }
                    for(let index in res.data){
                      let distance = res.data[index].distance;
                      res.data[index].distance = util.formatDistance(distance);
                    }

                    newdata = {};
                    newdata[compid + '.franchisee_data'] = res.data;
                    newdata[compid + '.is_more'] = res.is_more;
                    newdata[compid + '.curpage'] = 1;

                    pageInstance.setData(newdata);
                  }
                });
              }
            });
          }
        });
      }
    }

    if (!!pageInstance.relobj_auto) {
      for (let i in pageInstance.relobj_auto) {
        let objrel = pageInstance.relobj_auto[i].obj_rel;
        let AutoAddCount = pageInstance.relobj_auto[i].auto_add_count;
        let compid = pageInstance.relobj_auto[i].compid;
        let hasCounted = pageInstance.relobj_auto[i].has_counted;   // 默认是 0，没有计算过
        let parentcompid = pageInstance.relobj_auto[i].parentcompid;

        if (parentcompid != '' && parentcompid != null) {
          if (compid.search('data.') !== -1) {
            compid = compid.substr(5);
          }
          compid = parentcompid + '.' + compid;
        }

        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: '/index.php?r=AppData/getCount',
          data: {
            obj_rel: objrel
          },
          success: function (res) {
            if (res.status == 0) {
              if (AutoAddCount == 1) {
                if (hasCounted == 0) {
                  pageInstance.requestNum = pageRequestNum + 1;
                  _this.sendRequest({
                    hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
                    url: '/index.php?r=AppData/addCount',
                    data: {
                      obj_rel: objrel
                    },
                    success: function (newres) {
                      if (newres.status == 0) {
                        newdata = {};
                        newdata[compid + '.count_data.count_num'] = parseInt(newres.data.count_num);
                        newdata[compid + '.count_data.has_count'] = parseInt(newres.data.has_count);
                        pageInstance.setData(newdata);
                      }
                    },
                    fail: function () {
                    }
                  });
                }
              } else {
                newdata = {};
                newdata[compid + '.count_data.count_num'] = parseInt(res.data.count_num);
                newdata[compid + '.count_data.has_count'] = parseInt(res.data.has_count);
                pageInstance.setData(newdata);
              }
            }
          }
        });
      }
    }

    if(pageInstance.bbsCompIds.length){
      for (let i in pageInstance.bbsCompIds) {
        let compid = pageInstance.bbsCompIds[i],
            bbsData = pageInstance.data[compid],
            bbs_idx_value = '';

        if(bbsData.customFeature.ifBindPage && bbsData.customFeature.ifBindPage !== 'false'){
          if(pageInstance.page_form && pageInstance.page_form != 'none'){
            bbs_idx_value = pageInstance.page_form + '_' + pageInstance.dataId;
          }else{
            bbs_idx_value = pageInstance.page_router;
          }
        }else{
          bbs_idx_value = _this.getAppId();
        }
        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: '/index.php?r=AppData/getFormDataList',
          method: 'post',
          data: {
            form: 'bbs',
            is_count: bbsData.customFeature.ifLike ? 1 : 0,
            page: 1,
            idx_arr: {
              idx: 'rel_obj',
              idx_value: bbs_idx_value
            }
          },
          success: function(res){
            let data = {};

            res.isloading = false;

            data[compid+'.content'] = res;
            data[compid+'.comment'] = {};
            pageInstance.setData(data);
          }
        });
      }
    }
    if (!!pageInstance.communityComps) {
      for (let i in pageInstance.communityComps) {
        let compid = pageInstance.communityComps[i].compid,
            dataId = [],
            content = pageInstance.data[compid].content,
            customFeature = pageInstance.data[compid].customFeature,
            styleData = {},
            imgStyle = [],
            liStyle = [],
            secStyle = [];

        secStyle = [
              'color:'+ customFeature.secColor ,
              'text-decoration:' + (customFeature.secTextDecoration || 'none'),
              'text-align:' + (customFeature.secTextAlign || 'left'),
              'font-size:' + customFeature.secFontSize,
              'font-style:' + (customFeature.secFontStyle || 'normal'),
              'font-weight:' + (customFeature.secFontWeight || 'normal')
          ].join(";");

        imgStyle = [
                'width :'+ (customFeature.imgWidth * 2.34) + 'rpx',
                'height :'+ (customFeature.imgHeight * 2.34) + 'rpx'
          ].join(";");
        liStyle = [
              'height :'+ (customFeature.lineHeight * 2.34) + 'rpx',
              'margin-bottom :'+ (customFeature.margin * 2.34) +'rpx'
          ];
        customFeature['lineBackgroundColor'] && (liStyle.push('background-color:' + customFeature['lineBackgroundColor']));
        customFeature['lineBackgroundImage'] && (liStyle.push('background-image:' + customFeature['lineBackgroundImage']));
        liStyle = liStyle.join(";");

        styleData[compid + '.secStyle'] = secStyle;
        styleData[compid + '.imgStyle'] = imgStyle;
        styleData[compid + '.liStyle']  = liStyle;
        pageInstance.setData(styleData);

        for (let j in content) {
          dataId.push(content[j]['community-id']);
        }

        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: '/index.php?r=AppSNS/GetSectionByPage',
          data: {
            section_ids : dataId ,
            page: 1 ,
            page_size: 100
          },
          method: 'post',
          success: function (res) {
            if (res.status == 0) {
              var ddata = {},
                  lastdata = [],
                  newdata = {};

              for (let x = 0; x < res.data.length; x++) {
                let val = res.data[x];
                ddata[val.id] =val;
              }
              for (let y = 0; y < dataId.length; y++) {
                let val = ddata[dataId[y]];
                if(val){
                  lastdata.push(val);
                }
              }
              newdata[compid + '.community_data'] = lastdata;

              pageInstance.setData(newdata);
            }
          }
        });
      }
    }

    if (pageInstance.cityLocationComps.length){
      for (let i in pageInstance.cityLocationComps){
        pageInstance.data[pageInstance.cityLocationComps[i]].hidden = false;
        _this.getLocation({
          success:function(res){
            var latitude = res.latitude,
                longitude = res.longitude;

            pageInstance.requestNum = pageRequestNum + 1;
            _this.sendRequest({
              hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
              url: '/index.php?r=Region/GetAreaInfoByLatAndLng',
              data: {
                latitude: latitude,
                longitude: longitude
              },
              success:function(res){
                var newdata = pageInstance.data,
                    id =  pageInstance.cityLocationComps[i];

                newdata[id].provinces = [];
                newdata[id].provinces_ids = [];
                newdata[id].province = '';
                newdata[id].citys = [];
                newdata[id].city_ids = [];
                newdata[id].city = '';
                newdata[id].districts = [];
                newdata[id].district_ids = [];
                newdata[id].district = '';
                newdata[id].value = [0,0,0];
                newdata[id].local = res.data.addressComponent.province+' '+res.data.addressComponent.city + ' ' +res.data.addressComponent.district + ' >';
                pageInstance.setData(newdata);
              }
            })
          }
        });
        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: '/index.php?r=AppRegion/getAllExistedDataRegionList&is_xcx=1',
          success:function(data){
            var newdata = pageInstance.data,
                    id =  pageInstance.cityLocationComps[i];
            newdata[id].areaList = data.data;
            pageInstance.setData(newdata);
          },
        });
      }
    }

    // 秒杀
    if (!!pageInstance.seckillOnLoadCompidParam) {
      for (let i in pageInstance.seckillOnLoadCompidParam) {
        let compid = pageInstance.seckillOnLoadCompidParam[i].compid;
        let param = pageInstance.seckillOnLoadCompidParam[i].param;

        param.is_seckill = 1;
        pageInstance.requestNum = pageRequestNum + 1;
        _this.sendRequest({
          hideLoading: pageRequestNum++ == 1 ? false : true,   // 页面第一个请求才展示loading
          url: '/index.php?r=AppShop/GetGoodsList',
          data: param,
          method: 'post',
          success: function (res) {
            if (res.status == 0) {
              let rdata = res.data,
                  newdata = {},
                  downcountArr = pageInstance.data.downcountArr || [];

              for (let i = 0; i < rdata.length; i++) {
                let f = rdata[i].form_data,
                    dc ;

                f.downCount = {
                  hours : '00' ,
                  minutes : '00' ,
                  seconds : '00'
                };
                if(f.seckill_start_state == 0){
                  dc = _this.beforeSeckillDownCount(f , pageInstance , compid + '.goods_data[' + i + '].form_data');
                }else if(f.seckill_start_state == 1){
                  dc = _this.duringSeckillDownCount(f , pageInstance , compid + '.goods_data[' + i + '].form_data');
                }
                downcountArr.push(dc);
              }

              newdata[compid + '.goods_data'] = res.data;

              newdata[compid + '.is_more'] = res.is_more;
              newdata[compid + '.curpage'] = 1;
              newdata.downcountArr = downcountArr;

              pageInstance.setData(newdata);
            }
          }
        });
      }
    }
  },
  pageScrollFunc: function(compid, curpage){
    var pageInstance = this.getAppCurrentPage();
    var newdata = {};
    var param = {};
    var _this = this;

    if (pageInstance.list_compids_params) {
      for (let index in pageInstance.list_compids_params) {
        if (pageInstance.list_compids_params[index].compid === compid) {
          param = pageInstance.list_compids_params[index].param;
          break;
        }
      }
    }

    param.page = curpage;

    _this.sendRequest({
      url: '/index.php?r=AppData/getFormDataList',
      data: param,
      method: 'post',
      success: function (res) {
        newdata = {};

        for (let j in res.data) {
          for (let k in res.data[j].form_data) {
            if (k == 'category') {
              continue;
            }

            let description = res.data[j].form_data[k];

            if (!description) {
              continue;
            }
            // 检测如果不是一个图片链接的话就解析
            if(typeof description === 'string' && !/^http:\/\/img/g.test(description)){
              res.data[j].form_data[k] = _this.getWxParseResult(description);
            }
          }
        }

        newdata[compid + '.list_data'] = pageInstance.data[compid].list_data.concat(res.data);
        newdata[compid + '.is_more'] = res.is_more;
        newdata[compid + '.curpage'] = res.current_page;

        pageInstance.setData(newdata);
      },
      complete: function(){
        setTimeout(function(){
          pageInstance.requesting = false;
        }, 300);
      }
    })
  },
  goodsScrollFunc: function(compid, curpage){
    var pageInstance = this.getAppCurrentPage(),
        newdata = {},
        param = {};

    if (pageInstance.goods_compids_params) {
      for (let index in pageInstance.goods_compids_params) {
        if (pageInstance.goods_compids_params[index].compid === compid) {
          param = pageInstance.goods_compids_params[index].param;
          break;
        }
      }
    }

    param.page = curpage;

    this.sendRequest({
      url: '/index.php?r=AppShop/GetGoodsList',
      data: param,
      method: 'post',
      success: function (res) {
        newdata = {};
        newdata[compid + '.goods_data'] = pageInstance.data[compid].goods_data.concat(res.data);
        newdata[compid + '.is_more'] = res.is_more;
        newdata[compid + '.curpage'] = res.current_page;

        pageInstance.setData(newdata);
      },
      complete: function(){
        setTimeout(function(){
          pageInstance.requesting = false;
        }, 300);
      }
    })
  },
  franchiseeScrollFunc: function(compid, curpage){
    var pageInstance = this.getAppCurrentPage(),
        newdata = {},
        param = {};

    if (pageInstance.franchiseeComps) {
      for (let index in pageInstance.franchiseeComps) {
        if (pageInstance.franchiseeComps[index].compid === compid) {
          param = pageInstance.franchiseeComps[index].param;
          break;
        }
      }
    }

    param.page = curpage;

    this.sendRequest({
      url: '/index.php?r=AppShop/GetAppShopByPage',
      data: param,
      method: 'post',
      success: function (res) {
        for(let index in res.data){
          let distance = res.data[index].distance;
          res.data[index].distance = util.formatDistance(distance);
        }
        newdata = {};
        newdata[compid + '.franchisee_data'] = pageInstance.data[compid].franchisee_data.concat(res.data);
        newdata[compid + '.is_more'] = res.is_more;
        newdata[compid + '.curpage'] = res.current_page;

        pageInstance.setData(newdata);
      },
      complete: function(){
        setTimeout(function(){
          pageInstance.requesting = false;
        }, 300);
      }
    })
  },
  // 秒杀滚动加载
  seckillScrollFunc: function(compid, curpage){
    let _this = this,
        pageInstance = this.getAppCurrentPage(),
        newdata = {},
        param = {};

    if (pageInstance.seckillOnLoadCompidParam) {
      for (let index in pageInstance.seckillOnLoadCompidParam) {
        if (pageInstance.seckillOnLoadCompidParam[index].compid === compid) {
          param = pageInstance.seckillOnLoadCompidParam[index].param;
          break;
        }
      }
    }

    param.page = curpage;

    _this.sendRequest({
      url: '/index.php?r=AppShop/GetGoodsList',
      data: param,
      method: 'post',
      success: function (res) {
        newdata = {};
        let rdata = res.data,
            downcountArr = pageInstance.data.downcountArr || [];

        for (let i = 0; i < rdata.length; i++) {
          let f = rdata[i].form_data,
              dc ,
              idx = (curpage-1) * 10 + i;

          f.downCount = {
            hours : '00' ,
            minutes : '00' ,
            seconds : '00'
          };
          if(f.seckill_start_state == 0){
            dc = _this.beforeSeckillDownCount(f , pageInstance , compid + '.goods_data[' + idx + '].form_data');
          }else if(f.seckill_start_state == 1){
            dc = _this.duringSeckillDownCount(f , pageInstance , compid + '.goods_data[' + idx + '].form_data');
          }
          downcountArr.push(dc);
        }
        newdata[compid + '.goods_data'] = pageInstance.data[compid].goods_data.concat(res.data);
        newdata[compid + '.is_more'] = res.is_more;
        newdata[compid + '.curpage'] = res.current_page;
        newdata.downcountArr = downcountArr;

        pageInstance.setData(newdata);
      },
      complete: function(){
        setTimeout(function(){
          pageInstance.requesting = false;
        }, 300);
      }
    })
  },
  // 点赞 取消点赞
  changeCountRequert : {},
  changeCount: function(dataset){
    var that = this,
        pageInstance = this.getAppCurrentPage(),
        newdata = {},
        counted = dataset.counted,
        compid = dataset.compid,
        objrel = dataset.objrel,
        form = dataset.form,
        dataIndex = dataset.index,
        parentcompid = dataset.parentcompid,
        parentType = dataset.parenttype,
        url,
        objIndex = compid + '_' +objrel;

    if(counted == 1){
      url = '/index.php?r=AppData/delCount';
    } else {
      url = '/index.php?r=AppData/addCount';
    }

    if(that.changeCountRequert[objIndex]){
      return ;
    }
    that.changeCountRequert[objIndex] = true;

    that.sendRequest({
      url: url,
      data: { obj_rel: objrel },
      success: function(res){
        newdata = {};

        // if (!!form) {
        // 在容器里面
        if (parentcompid) {
          if (parentcompid.indexOf('list_vessel') === 0){
            // 动态列表里
            newdata[parentcompid + '.list_data[' + dataIndex + '].count_num'] = counted == 1
              ? parseInt(pageInstance.data[parentcompid].list_data[dataIndex].count_num) - 1
              : parseInt(res.data.count_num);
            newdata[parentcompid + '.list_data[' + dataIndex + '].has_count'] = counted == 1
              ? 0 : parseInt(res.data.has_count);
          } else if (parentcompid.indexOf('bbs') === 0){
            // 评论组件里
            newdata[parentcompid + '.content.data[' + dataIndex + '].count_num'] = counted == 1
              ? parseInt(pageInstance.data[parentcompid].content.data[dataIndex].count_num) - 1
              : parseInt(res.data.count_num);
            newdata[parentcompid + '.content.data[' + dataIndex + '].has_count'] = counted == 1
              ? 0 : parseInt(res.data.has_count);
          }else if (parentcompid.indexOf('free_vessel') === 0 || parentcompid.indexOf('dynamic_vessel') === 0){
          // 自由面板里 或 动态容器里
            let path = compid
            if (compid.search('data.') !== -1) {
              path = compid.substr(5);
            }
            path = parentcompid + '.' + path;
            newdata[path + '.count_data.count_num'] = parseInt(res.data.count_num);
            newdata[path + '.count_data.has_count'] = parseInt(res.data.has_count);
          }else if(parentType && parentType.indexOf('list_vessel') === 0){
            // 动态列表里的自由面板里
            newdata[parentType + '.list_data[' + dataIndex + '].count_num'] = parseInt(res.data.count_num);
            newdata[parentType + '.list_data[' + dataIndex + '].has_count'] = parseInt(res.data.has_count);
          }
        } else {
        // 未放入容器
          if (parentcompid != '' && parentcompid != null) {
            if (compid.search('data.') !== -1) {
              compid = compid.substr(5);
            }
            compid = parentcompid + '.' + compid;
          }
          newdata[compid + '.count_data.count_num'] = parseInt(res.data.count_num);
          newdata[compid + '.count_data.has_count'] = parseInt(res.data.has_count);
          pageInstance.setData(newdata);
        }

        pageInstance.setData(newdata);
        that.changeCountRequert[objIndex] = false;
      },
      complete : function(){
        that.changeCountRequert[objIndex] = false;
      }
    });
  },
  inputChange: function (dataset, value) {
    let pageInstance = this.getAppCurrentPage();
    let datakey = dataset.datakey;
    let segment = dataset.segment;

    if (!segment) {
      this.showModal({
        content: '该组件未绑定字段 请在电脑编辑页绑定后使用'
      });
      return;
    }
    var newdata = {};
    newdata[datakey] = value;
    pageInstance.setData(newdata);
  },
  bindDateChange: function(dataset, value) {
    let pageInstance = this.getAppCurrentPage();
    let datakey      = dataset.datakey;
    let compid       = dataset.compid;
    let formcompid   = dataset.formcompid;
    let segment      = dataset.segment;
    let newdata      = {};

    compid = formcompid + compid.substr(4);

    if (!segment) {
      this.showModal({
        content: '该组件未绑定字段 请在电脑编辑页绑定后使用'
      });
      return;
    }

    let obj = pageInstance.data[formcompid]['form_data'];
    if (util.isPlainObject(obj)) {
      obj = pageInstance.data[formcompid]['form_data'] = {};
    }
    obj = obj[segment];

    if (!!obj) {
      let date = obj.substr(0, 10);
      let time = obj.substr(11);

      if (obj.length == 16) {
        newdata[datakey] = value + ' ' + time;
      } else if (obj.length == 10) {  
        newdata[datakey] = value;
      } else if (obj.length == 5) {  
        newdata[datakey] = value + ' ' + obj;
      } else if (obj.length == 0) {
        newdata[datakey] = value;
      }
    } else {
      newdata[datakey] = value;
    }
    newdata[compid + '.date'] = value;
    pageInstance.setData(newdata);
  },
  bindTimeChange: function(dataset, value){
    let pageInstance = this.getAppCurrentPage();
    let datakey      = dataset.datakey;
    let compid       = dataset.compid;
    let formcompid   = dataset.formcompid;
    let segment      = dataset.segment;
    let newdata      = {};

    compid = formcompid + compid.substr(4);

    if (!segment) {
      this.showModal({
        content: '该组件未绑定字段 请在电脑编辑页绑定后使用'
      });
      return;
    }

    let obj = pageInstance.data[formcompid]['form_data'];
    if (util.isPlainObject(obj)) {
      obj = pageInstance.data[formcompid]['form_data'] = {};
    }
    obj = obj[segment];

    if (!!obj) {
      let date = obj.substr(0, 10);
      let time = obj.substr(11);

      if (obj.length == 16) {
        newdata[datakey] = date + ' ' + value;
      } else if (obj.length == 10) {  // 只设置了 date
        newdata[datakey] = obj + ' ' + value;
      } else if (obj.length == 5) {   // 只设置了 time
        newdata[datakey] = value;
      } else if (obj.length == 0) {
        newdata[datakey] = value;
      }
    } else {
      newdata[datakey] = value;
    }
    newdata[compid + '.time'] = value;
    pageInstance.setData(newdata);
  },
  bindSelectChange: function(dataset, value) {
    let pageInstance = this.getAppCurrentPage();
    let datakey = dataset.datakey;
    let segment = dataset.segment;

    if (!segment) {
      this.showModal({
        content: '该组件未绑定字段 请在电脑编辑页绑定后使用'
      });
      return;
    }
    var newdata = {};
    newdata[datakey] = value;
    pageInstance.setData(newdata);
  },
  bindScoreChange: function(dataset){
    let pageInstance = this.getAppCurrentPage();
    let datakey      = dataset.datakey;
    let value        = dataset.score;
    let compid       = dataset.compid;
    let formcompid   = dataset.formcompid;
    let segment      = dataset.segment;

    compid = formcompid + compid.substr(4);

    if (!segment) {
      this.showModal({
        content: '该组件未绑定字段 请在电脑编辑页绑定后使用'
      });
      return;
    }
    var newdata = {};
    newdata[datakey] = value;
    newdata[compid + '.editScore'] = value;
    pageInstance.setData(newdata);
  },
  submitForm: function(dataset){
    let pageInstance = this.getAppCurrentPage();
    let _this = this;
    let compid = dataset.compid;
    let form = dataset.form;
    let form_data = pageInstance.data[compid].form_data;
    let field_info = pageInstance.data[compid].field_info;
    let content = pageInstance.data[compid].content;
    let formEleType = ['input-ele', 'textarea-ele', 'grade-ele', 'select-ele', 'upload-img', 'time-ele'];

    if (!util.isPlainObject(form_data)) {
      for(let index = 0; index < content.length; index++){
        if(formEleType.indexOf(content[index].type) == -1){
          continue;
        }
        let customFeature = content[index].customFeature,
            segment = customFeature.segment,
            ifMust = customFeature.ifMust;

        if ((!form_data[segment] || form_data[segment].length == 0) && ifMust === true) { // 提示错误
          _this.showModal({
            content: field_info[segment].title + ' 没有填写'
          });
          return;
        }
      }

      if(pageInstance.data[compid].submitting) return;
      let newdata = {};
      newdata[compid + '.submitting'] = true;
      pageInstance.setData(newdata);

      _this.sendRequest({
        hideLoading: true,
        url: '/index.php?r=AppData/addData',
        data: {
          form: form,
          form_data: form_data
        },
        method: 'POST',
        success: function (res) {
          _this.showToast({
            title: '提交成功',
            icon: 'success'
          });
        },
        complete: function(){
          let newdata = {};
          newdata[compid + '.submitting'] = false;
          pageInstance.setData(newdata);
        }
      })
    } else {
      _this.showModal({
        content: '这个表单什么都没填写哦！'
      });
    }
  },
  tapMapDetail: function(dataset){
    let params = dataset.eventParams;
    if(!params) return;

    params = JSON.parse(params)[0];
    this.openLocation({
      latitude: params.latitude,
      longitude: params.longitude,
      name: params.desc,
      address: params.name
    });
  },
  udpateVideoSrc: function (dataset) {
    let pageInstance = this.getAppCurrentPage();
    let compid = dataset.compid;

    this.chooseVideo(function(filePath){
      var newdata = {};
      newdata[compid + '.src'] = filePath;
      pageInstance.setData(newdata);
    });
  },
  uploadFormImg: function (dataset) {
    let pageInstance = this.getAppCurrentPage();
    let compid     = dataset.compid;
    let formcompid = dataset.formcompid;
    let datakey    = dataset.datakey;
    let segment    = dataset.segment;

    compid = formcompid + compid.substr(4);

    if (!segment) {
      this.showModal({
        content: '该组件未绑定字段 请在电脑编辑页绑定后使用'
      })
      console.log('segment empty 请绑定数据对象字段');
      return;
    }
    this.chooseImage(function (res) {
      let img_src = res[0];
      let newdata = pageInstance.data;
      typeof (newdata[compid + '.content']) == 'object' ? '' : newdata[compid + '.content'] = [];
      typeof (newdata[datakey]) == 'object' ? '' : newdata[datakey] = [];
      newdata[datakey].push(img_src);
      newdata[compid + '.display_upload'] = false;
      newdata[compid + '.content'].push(img_src);
      pageInstance.setData(newdata);
    });
  },
  deleteUploadImg:function(dataset){
    let pageInstance = this.getAppCurrentPage();
    let formcompid = dataset.formcompid;
    let index = dataset.index,
        compid = dataset.compid,
        datakey = dataset.datakey,
        newdata = pageInstance.data;
    compid = formcompid + compid.substr(4);
    this.showModal({
      content: '确定删除该图片？',
      confirm: function (){
        newdata[compid + '.content'].splice(index,1);
        newdata[datakey].splice(index, 1);
        pageInstance.setData(newdata);
      }
    })
  },
  listVesselTurnToPage: function (dataset) {
    let pageInstance = this.getAppCurrentPage();
    let data_id = dataset.dataid;
    let router = dataset.router;
    let page_form = pageInstance.page_form;

    if (router == -1 || router == '-1') {
      return;
    }
    if (page_form != '') {
      if(router == 'tostoreDetail'){
        this.turnToPage('/pages/toStoreDetail/toStoreDetail?detail=' + data_id);
      }else{
        this.turnToPage('/pages/' + router + '/' + router + '?detail=' + data_id);
      }
    }
  },
  sortListFunc: function (dataset) {
    let pageInstance  = this.getAppCurrentPage();
    let listid        = dataset.listid;
    let idx           = dataset.idx;
    let listParams    = {
                          'list-vessel': pageInstance.list_compids_params,
                          'goods-list': pageInstance.goods_compids_params,
                          'franchisee-list': pageInstance.franchiseeComps
                        };
    let component_params, listType;

    for (var key in listParams) {
      if(listType !== undefined) break;
      component_params = listParams[key];
      if(component_params.length){
        for (var j = 0; j < component_params.length; j++) {
          if(component_params[j].param.id === listid){
            listType = key;
            component_params = component_params[j];
          }
        }
      }
    }

    if(!component_params) return;
    component_params.param.page = 1;

    if (idx != 0) {
      component_params.param.sort_key       = dataset.sortkey;
      component_params.param.sort_direction = dataset.sortdirection;
    } else {
      component_params.param.sort_key       = '';
      component_params.param.sort_direction = 0;
    }

    switch(listType){
      case 'list-vessel': this.sortListVessel(component_params, dataset); break;
      case 'goods-list': this.sortGoodsList(component_params, dataset); break;
      case 'franchisee-list': this.sortFranchiseeList(component_params, dataset); break;
    }
  },
  sortListVessel: function(component_params, dataset){
    var that = this;
    let pageInstance  = this.getAppCurrentPage();
    this.sendRequest({
      url: '/index.php?r=AppData/getFormDataList',
      data: component_params.param,
      method: 'post',
      success: function (res) {
        if (res.status == 0) {
          let newdata = {};
          let compid  = component_params['compid'];

          for (let j in res.data) {
            for (let k in res.data[j].form_data) {
              if (k == 'category') continue;

              let description = res.data[j].form_data[k];
              if (!description) continue;

              // 检测如果不是一个图片链接的话就解析
              if(typeof description === 'string' && !/^http:\/\/img/g.test(description)){
                res.data[j].form_data[k] = that.getWxParseResult(description);
              }
            }
          }

          newdata[compid + '.list_data'] = res.data;
          newdata[compid + '.is_more']   = res.is_more;
          newdata[compid + '.curpage']   = 1;

          that.updateSortStatus(dataset,component_params);
          pageInstance.setData(newdata);
        }
      }
    });
  },
  sortGoodsList: function(component_params, dataset){
    var that = this;
    let pageInstance  = this.getAppCurrentPage();
    this.sendRequest({
      url: '/index.php?r=AppShop/GetGoodsList',
      data: component_params.param,
      method: 'post',
      success: function (res) {
        if (res.status == 0) {
          let newdata = {};
          let compid  = component_params['compid'];

          newdata[compid + '.goods_data'] = res.data;
          newdata[compid + '.is_more'] = res.is_more;
          newdata[compid + '.curpage'] = 1;

          that.updateSortStatus(dataset, newdata);
          pageInstance.setData(newdata);
        }
      }
    });
  },
  sortFranchiseeList: function(component_params, dataset){
    var that = this;
    let pageInstance  = this.getAppCurrentPage();
    this.sendRequest({
      url: '/index.php?r=AppShop/GetAppShopByPage',
      data: component_params.param,
      method: 'post',
      success: function (res) {
        if (res.status == 0) {
          let newdata = {};
          let compid  = component_params['compid'];

          for(let index in res.data){
            let distance = res.data[index].distance;
            res.data[index].distance = util.formatDistance(distance);
          }
          newdata[compid + '.franchisee_data'] = res.data;
          newdata[compid + '.is_more'] = res.is_more;
          newdata[compid + '.curpage'] = 1;

          that.updateSortStatus(dataset, newdata);
          pageInstance.setData(newdata);
        }
      }
    });
  },
  updateSortStatus: function(dataset, newdata){
    let pageInstance  = this.getAppCurrentPage();
    let sortCompid = dataset.compid;
    let selectSortIndex = dataset.idx;

    newdata[sortCompid + '.customFeature.selected'] = selectSortIndex;
    if (selectSortIndex != 0 && dataset.sortdirection == 1) {
      newdata[sortCompid + '.content[' + selectSortIndex + '].customFeature.sort_direction'] = 0;
    } else if (selectSortIndex != 0) {
      newdata[sortCompid + '.content[' + selectSortIndex + '].customFeature.sort_direction'] = 1;
    } else if (selectSortIndex == 0) {
      newdata[sortCompid + '.content[' + selectSortIndex + '].customFeature.sort_direction'] = 0;
    }

    pageInstance.setData(newdata);
  },
  bbsInputComment: function(dataset, comment){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        data = {};

    data[compid+'.comment.text'] = comment;
    pageInstance.setData(data);
  },
  bbsInputReply: function(dataset, comment){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        index = dataset.index,
        data = {};

    data[compid+'.content.data['+index+'].replyText'] = comment;
    pageInstance.setData(data);
  },
  uploadBbsCommentImage: function(dataset){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        data = {};

    this.chooseImage(function(res){
      data[compid+'.comment.img'] = res[0];
      pageInstance.setData(data);
    });
  },
  uploadBbsReplyImage: function(dataset){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        index = dataset.index,
        data = {};

    this.chooseImage(function(res){
      data[compid+'.content.data['+index+'].replyImg'] = res[0];
      pageInstance.setData(data);
    });
  },
  deleteCommentImage: function(dataset){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        data = {};

    data[compid+'.comment.img'] = '';
    pageInstance.setData(data);
  },
  deleteReplyImage: function(dataset){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        index = dataset.index,
        data = {};

    data[compid+'.content.data['+index+'].replyImg'] = '';
    pageInstance.setData(data);
  },
  bbsPublishComment: function(dataset){
    var _this = this,
        pageInstance  = this.getAppCurrentPage(),
        compid = dataset.compid,
        bbsData = pageInstance.data[compid],
        comment = bbsData.comment,
        param;

    if(!comment.text || !comment.text.trim()){
      this.showModal({
        content: '请输入评论内容'
      })
      return;
    }

    delete comment.showReply;
    comment.addTime = util.formatTime();

    param = {};
    param.nickname = pageInstance.data.userInfo.nickname;
    param.cover_thumb = pageInstance.data.userInfo.cover_thumb;
    param.user_token = pageInstance.data.userInfo.user_token;
    param.page_url = pageInstance.page_router;
    param.content = comment;
    param.rel_obj = '';
    if(bbsData.customFeature.ifBindPage && bbsData.customFeature.ifBindPage !== 'false'){
      if(pageInstance.page_form && pageInstance.page_form != 'none'){
        param.rel_obj = pageInstance.page_form + '_' + pageInstance.dataId;
      }else{
        param.rel_obj = pageInstance.page_router;
      }
    }else{
      param.rel_obj = _this.getAppId();
    }

    this.sendRequest({
      url: '/index.php?r=AppData/addData',
      method: 'post',
      data: {
        form: 'bbs',
        form_data: param
      },
      success: function(res){
        var commentList = pageInstance.data[compid].content.data || [],
            newdata = {};

        param.id = res.data;
        newdata[compid+'.content.data'] = [{
          form_data: param,
          count_num: 0
        }].concat(commentList);
        newdata[compid+'.content.count'] = +pageInstance.data[compid].content.count + 1;
        newdata[compid+'.comment'] = {};

        pageInstance.setData(newdata);
      }
    })
  },
  clickBbsReplyBtn: function(dataset){
    var pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        index = dataset.index,
        data = {};

    data[compid+'.content.data['+index+'].showReply'] = !pageInstance.data[compid].content.data[index].showReply;
    pageInstance.setData(data);
  },
  bbsPublishReply: function(dataset){
    var _this = this,
        pageInstance = this.getAppCurrentPage(),
        compid = dataset.compid,
        index = dataset.index,
        bbsData = pageInstance.data[compid],
        form_data = bbsData.content.data[index].form_data,
        comment = {},
        param;

    comment.text = bbsData.content.data[index].replyText;
    comment.img = bbsData.content.data[index].replyImg;
    if(!comment.text || !comment.text.trim()){
      this.showModal({
        content: '请输入回复内容'
      })
      return;
    }

    comment.addTime = util.formatTime();
    comment.reply = {
      nickname: form_data.nickname,
      text: form_data.content.text,
      img: form_data.content.img,
      user_token: form_data.user_token,
      reply: form_data.content.reply
    };

    param = {};
    param.nickname = pageInstance.data.userInfo.nickname;
    param.cover_thumb = pageInstance.data.userInfo.cover_thumb;
    param.user_token = pageInstance.data.userInfo.user_token;
    param.page_url = pageInstance.page_router;
    param.content = comment;
    param.rel_obj = '';
    if(bbsData.customFeature.ifBindPage && bbsData.customFeature.ifBindPage !== 'false'){
      if(pageInstance.page_form && pageInstance.page_form != 'none'){
        param.rel_obj = pageInstance.page_form + '_' + pageInstance.dataId;
      }else{
        param.rel_obj = pageInstance.page_router;
      }
    }else{
      param.rel_obj = _this.getAppId();
    }

    this.sendRequest({
      url: '/index.php?r=AppData/addData',
      method: 'post',
      data: {
        form: 'bbs',
        form_data: param,
      },
      success: function(res){
        var commentList = pageInstance.data[compid].content.data || [],
            newdata = {};

        param.id = res.data;
        if(commentList.length){
          delete commentList[index].replyText;
          delete commentList[index].showReply;
        }
        newdata[compid+'.content.data'] = [{
          form_data: param,
          count_num: 0
        }].concat(commentList);
        newdata[compid+'.content.count'] = +pageInstance.data[compid].content.count + 1;
        newdata[compid+'.comment'] = {};

        pageInstance.setData(newdata);
      }
    })
  },
  bbsScrollFuc : function(compid) {
    var _this = this,
        pageInstance = this.getAppCurrentPage(),
        bbsData = pageInstance.data[compid],
        bbs_idx_value = '';

      if(bbsData.content.isloading || bbsData.content.is_more == 0){
        return ;
      }
      bbsData.content.isloading = true;

      if(bbsData.customFeature.ifBindPage && bbsData.customFeature.ifBindPage !== 'false'){
        if(pageInstance.page_form && pageInstance.page_form != 'none'){
          bbs_idx_value = pageInstance.page_form + '_' + pageInstance.dataId;
        }else{
          bbs_idx_value = pageInstance.page_router;
        }
      }else{
        bbs_idx_value = _this.getAppId();
      }
      _this.sendRequest({
        url: '/index.php?r=AppData/getFormDataList',
        method: 'post',
        data: {
          form: 'bbs',
          is_count: bbsData.customFeature.ifLike ? 1 : 0,
          page: bbsData.content.current_page + 1,
          idx_arr: {
            idx: 'rel_obj',
            idx_value: bbs_idx_value
          }
        },
        success: function(res){
          let data = {},
              newData = {};
          data = res;

          data.data = bbsData.content.data.concat(res.data);
          data.isloading = false;

          newData[compid+'.content'] = data;
          pageInstance.setData(newData);
        },
        complete: function() {
          let newData = {};
          newData[compid+'.content.isloading'] = false;
          pageInstance.setData(newData);
        }
      });
  },
  searchList:function(dataset){
    let pageInstance = this.getAppCurrentPage();
    let that = this;
    let compid = dataset.compid;
    let listid = dataset.listid;
    let listType = dataset.listtype;
    let form = dataset.form;
    let keyword = pageInstance.keywordList[compid];

    let targetList = '';
    let index      = '';

    if(listType === 'list-vessel'){
      for (index in pageInstance.list_compids_params) {
        if (pageInstance.list_compids_params[index].param.id === listid) {
          pageInstance.list_compids_params[index].param.page = 1;
          targetList = pageInstance.list_compids_params[index];
          break;
        }
      }
    }

    if(listType === 'goods-list'){
      for (index in pageInstance.goods_compids_params) {
        if (pageInstance.goods_compids_params[index].param.id === listid) {
          pageInstance.goods_compids_params[index].param.page = 1;
          targetList = pageInstance.goods_compids_params[index];
          break;
        }
      }
    }

    if(listType === 'franchisee-list'){
      for (index in pageInstance.franchiseeComps) {
        if (pageInstance.franchiseeComps[index].param.id === listid) {
          pageInstance.franchiseeComps[index].param.page = 1;
          targetList = pageInstance.franchiseeComps[index];
          break;
        }
      }
    }

    let url = '/index.php?r=appData/search';
    let param = {"search":{"data":[{"_allkey":keyword,"form": form}],"app_id":targetList.param.app_id}};

    if(listType === 'franchisee-list'){
      let info = this.getLocationInfo();
      param.search.longitude = info.longitude;
      param.search.latitude = info.latitude;
    }

    this.sendRequest({
      url: url,
      data: param,
      success: function (res) {
        if(res.data.length == 0){
          setTimeout(function(){
            that.showToast({
              title: '没有找到与'+keyword+'相关的内容',
              duration: 2000
            });
          },0)
          return;
        }
        if (res.status == 0) {
          let newdata = {};
          if (listType === "goods-list") {
            newdata[targetList.compid + '.goods_data'] = res.data;
          } else if (listType === 'list-vessel') {
            //兼容初始化后的数据结构
            for (let j in res.data) {
              for (let k in res.data[j].form_data) {
                if (k == 'category') {
                  continue;
                }
                let description = res.data[j].form_data[k];
                if (!description) {
                  continue;
                }
                // 检测如果不是一个图片链接的话就解析
                if (typeof description === 'string' && !/^http:\/\/img/g.test(description)) {
                  res.data[j].form_data[k] = that.getWxParseResult(description);
                }
              }
            }
            newdata[targetList.compid + '.list_data'] = res.data;
          } else if (listType === 'franchisee-list') {
            for(let index in res.data){
              let distance = res.data[index].distance;
              res.data[index].distance = util.formatDistance(distance);
            }
            newdata[targetList.compid + '.franchisee_data'] = res.data;
          }

          newdata[targetList.compid + '.is_more']   = res.is_more;
          newdata[targetList.compid + '.curpage']   = 1;

          pageInstance.setData(newdata);
        }
      },
      fail: function (err) {
        console.log(err);
      }
    })
  },
  citylocationList:function(dataset, region_id){
    let compid = dataset.id,
        listid = dataset.listid,
        listType = dataset.listtype,
        form = dataset.form,
        index = '',
        targetList = '',
        that = this,
        pageInstance = this.getAppCurrentPage();

    if(listType === 'list-vessel'){
      for (index in pageInstance.list_compids_params) {
        if (pageInstance.list_compids_params[index].param.id === listid) {
          pageInstance.list_compids_params[index].param.page = 1;
          targetList = pageInstance.list_compids_params[index];
          break;
        }
      }
    }

    if(listType === 'goods-list'){
      for (index in pageInstance.goods_compids_params) {
        if (pageInstance.goods_compids_params[index].param.id === listid) {
          pageInstance.goods_compids_params[index].param.page = 1;
          targetList = pageInstance.goods_compids_params[index];
          break;
        }
      }
    }

    if(listType === 'franchisee-list'){
      for (index in pageInstance.franchiseeComps) {
        if (pageInstance.franchiseeComps[index].param.id === listid) {
          pageInstance.franchiseeComps[index].param.page = 1;
          targetList = pageInstance.franchiseeComps[index];
          break;
        }
      }
    }
    let url = '/index.php?r=AppData/GetFormDataList&idx_arr[idx]=region_id&idx_arr[idx_value]='+region_id+'&extra_cond_arr[latitude]='+this.globalData.locationInfo.latitude+'&extra_cond_arr[longitude]='+this.globalData.locationInfo.longitude + '&extra_cond_arr[county_id]='+region_id,
        param = {'form':form};
    this.sendRequest({
      url: url,
      data: param,
      success:function(res){
        if(res.data.length == 0){
          setTimeout(function(){
            that.showToast({
              title: '没有找到与所选区域的相关的内容',
              duration: 2000
            });
          },0)
          return;
        }
        if (res.status == 0) {
          let newdata = {};

          if (listType === "goods-list") {
            newdata[targetList.compid + '.goods_data'] = res.data;
          } else if (listType === 'list-vessel') {
            if(param.form !== 'form'){ // 动态列表绑定表单则不调用富文本解析
              for (let j in res.data) {
                for (let k in res.data[j].form_data) {
                  if (k == 'category') {
                    continue;
                  }

                  let description = res.data[j].form_data[k];

                  if (!description) {
                    continue;
                  }
                  // 检测如果不是一个图片链接的话就解析
                  if(typeof description === 'string' && !/^http:\/\/img/g.test(description)){
                    res.data[j].form_data[k] = that.getWxParseResult(description);
                  }
                }
              }
            }
            newdata[targetList.compid + '.list_data'] = res.data;
          } else if (listType === 'franchisee-list') {
            for(let index in res.data){
              let distance = res.data[index].distance;
              res.data[index].distance = util.formatDistance(distance);
            }
            newdata[targetList.compid + '.franchisee_data'] = res.data;
          }

          newdata[targetList.compid + '.is_more']   = res.is_more;
          newdata[targetList.compid + '.curpage']   = 1;

          pageInstance.setData(newdata);
        }
      },
      fail:function(err){
        console.log(err)
      }
    })
  },
  tapFranchiseeLocation: function(event){
    var _this = this,
        compid = event.currentTarget.dataset.compid,
        pageInstance = this.getAppCurrentPage();

    function success(res){
      var name = res.name,
          lat = res.latitude,
          lng = res.longitude,
          newdata = {},
          param, requestData;

      newdata[compid +'.location_address'] = name;
      pageInstance.setData(newdata);

      for(var index in pageInstance.franchiseeComps){
        if(pageInstance.franchiseeComps[index].param.id = compid){
          param = pageInstance.franchiseeComps[index].param;
          param.latitude = lat;
          param.longitude = lng;
        }
      }
      requestData = {
        id: compid,
        form: 'app_shop',
        page: 1,
        sort_key: param.sort_key,
        sort_direction: param.sort_direction,
        latitude: param.latitude,
        longitude: param.longitude,
        idx_arr: param.idx_arr
      }
      _this.refreshFranchiseeList(compid, requestData, pageInstance);
    }

    function cancel(){
      console.log('cancel');
    }

    function fail(){
      console.log('fail');
    }
    this.chooseLocation({
      success: success,
      fail: fail,
      cancel: cancel
    });
  },

  // 获取"详情页"数据
  getDynamicPageData: function(param){
    param.url = '/index.php?r=AppData/getFormData';
    this.sendRequest(param);
  },

  getDynamicListData: function(param){
    param.url = '/index.php?r=AppData/getFormDataList';
    this.sendRequest(param);
  },
  getAssessList: function(param){
    param.url = '/index.php?r=AppShop/GetAssessList';
    this.sendRequest(param);
  },
  getOrderDetail: function(param){
    param.url = '/index.php?r=AppShop/getOrder';
    this.sendRequest(param);
  },
  modifyPostParam: function(obj) {
    let query = '',
        name, value, fullSubName, subName, subValue, innerObj, i;

    for(name in obj) {
      value = obj[name];

      if(value instanceof Array) {
        for(i=0; i < value.length; ++i) {
          subValue = value[i];
          fullSubName = name + '[' + i + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += this.modifyPostParam(innerObj) + '&';
        }
      }
      else if(value instanceof Object) {
        for(subName in value) {
          subValue = value[subName];
          fullSubName = name + '[' + subName + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += this.modifyPostParam(innerObj) + '&';
        }
      }
      else if(value !== undefined && value !== null)
        query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
    }

    return query.length ? query.substr(0, query.length - 1) : query;
  },
  getHomepageRouter: function(){
    return this.globalData.homepageRouter;
  },
  getAppId: function(){
    return this.globalData.appId;
  },
  getDefaultPhoto: function(){
    return this.globalData.defaultPhoto;
  },
  getSessionKey: function(){
    return this.globalData.sessionKey;
  },
  setSessionKey: function(session_key){
    this.globalData.sessionKey = session_key;
    wx.setStorage({
      key: 'session_key',
      data: session_key
    })
  },
  getUserInfo: function(){
    return this.globalData.userInfo;
  },
  setUserInfoStorage: function(info){
    for(var key in info){
      this.globalData.userInfo[key] = info[key];
    }
    wx.setStorage({
      key: 'userInfo',
      data: this.globalData.userInfo
    })
  },
  setPageUserInfo: function(){
    var currentPage = this.getAppCurrentPage(),
        newdata = {};

    newdata['userInfo'] = this.getUserInfo();
    currentPage.setData(newdata);
  },
  getAppCurrentPage: function(){
    var pages = getCurrentPages();
    return pages[pages.length - 1];
  },
  getWaimaiTotalNum: function(){
    return this.globalData.waimaiTotalNum;
  },
  setWaimaiTotalNum: function(num){
    this.globalData.waimaiTotalNum = num;
  },
  getWaimaiTotalPrice: function(){
    return this.globalData.waimaiTotalPrice;
  },
  setWaimaiTotalPrice: function(price){
    this.globalData.waimaiTotalPrice = price;
  },
  getWaimaiCartIds: function(){
    return this.globalData.waimaiCartIds;
  },
  setWaimaiCartId: function(goodsId, cartId){
    if(cartId && cartId != 0){
      this.globalData.waimaiCartIds[goodsId] = cartId;
    } else {
      delete this.globalData.waimaiCartIds[goodsId];
    }
  },
  getTabPagePathArr: function(){
    return JSON.parse(this.globalData.tabBarPagePathArr);
  },
  getWxParseOldPattern: function(){
    return this.globalData.wxParseOldPattern;
  },
  getWxParseResult: function(data, setDataKey){
    var page = this.getAppCurrentPage();
    return WxParse.wxParse(setDataKey || this.getWxParseOldPattern(),'html', data, page);
  },
  tapGoodsTradeHandler: function(event) {
    if (event.currentTarget.dataset.eventParams) {
      let goods = JSON.parse(event.currentTarget.dataset.eventParams),
          goods_id = goods['goods_id'],
          goods_type = goods['goods_type'];
      if (!!goods_id) {
        goods_type == 3 ? this.turnToPage('/pages/toStoreDetail/toStoreDetail?detail=' + goods_id)
                        : this.turnToPage('/pages/goodsDetail/goodsDetail?detail=' + goods_id);
      }
    }
  },
  tapInnerLinkHandler: function(event) {
    var param = event.currentTarget.dataset.eventParams;
    if (param) {
      param = JSON.parse(param);
      var url = param.inner_page_link;
      if(url === 'prePage'){
        this.turnBack();
      } else if (url) {
        var is_redirect = param.is_redirect == 1 ? true : false;
        this.turnToPage(url, is_redirect);
      }
    }
  },
  tapPhoneCallHandler: function(event) {
    if (event.currentTarget.dataset.eventParams) {
      var phone_num = JSON.parse(event.currentTarget.dataset.eventParams)['phone_num'];
      this.makePhoneCall(phone_num);
    }
  },
  tapGetCouponHandler: function(event) {
    if (event.currentTarget.dataset.eventParams) {
      var coupon_id = JSON.parse(event.currentTarget.dataset.eventParams)['coupon_id'];
      this.turnToPage('/pages/couponDetail/couponDetail?detail=' + coupon_id);
    }
  },
  tapCommunityHandler: function(event) {
    if (event.currentTarget.dataset.eventParams) {
      let community_id = JSON.parse(event.currentTarget.dataset.eventParams)['community_id'];
      this.turnToPage('/pages/communityPage/communityPage?detail=' + community_id);
    }
  },
  tapToFranchiseeHandler: function(event){
    if (event.currentTarget.dataset.eventParams) {
      let franchisee_id = JSON.parse(event.currentTarget.dataset.eventParams)['franchisee_id'];
      this.turnToPage('/pages/franchiseeDetail/franchiseeDetail?detail=' + franchisee_id);
    }
  },
  tapToTransferPageHandler: function(event) {
    this.turnToPage('/pages/transferPage/transferPage');
  },
  tapToSeckillHandler: function(event) {
    if (event.currentTarget.dataset.eventParams) {
      let goods = JSON.parse(event.currentTarget.dataset.eventParams),
          seckill_id = goods['seckill_id'],
          seckill_type = goods['seckill_type'];
      if (!!seckill_id) {
        this.turnToPage('/pages/goodsDetail/goodsDetail?goodsType=seckill&detail=' + seckill_id);
      }
    }
  },
  tapRefreshListHandler: function (event, pageInstance) {
    var eventParams = JSON.parse(event.currentTarget.dataset.eventParams);
    var refreshObject = eventParams.refresh_object;
    var compids_params;

    if((compids_params = pageInstance.goods_compids_params).length) {
      for (let index in compids_params) {
        if (compids_params[index].param.id === refreshObject) {
          this.refreshPageList('goods-list', eventParams, compids_params[index], pageInstance);
          return;
        }
      }
    }
    if((compids_params = pageInstance.list_compids_params).length) {
      for (let index in compids_params) {
        if (compids_params[index].param.id === refreshObject) {
          this.refreshPageList('list-vessel', eventParams, compids_params[index], pageInstance);
          return;
        }
      }
    }
    if((compids_params = pageInstance.franchiseeComps).length) {
      for (let index in compids_params) {
        if (compids_params[index].param.id === refreshObject) {
          this.refreshPageList('franchisee-list', eventParams, compids_params[index], pageInstance);
          return;
        }
      }
    }
  },
  refreshPageList: function(eleType, eventParams, compids_params, pageInstance){
    var requestData = {
          page: 1,
          form: compids_params.param.form,
          is_count: compids_params.param.form.is_count ? 1 : 0,
          idx_arr: {
            idx: eventParams.index_segment,
            idx_value: eventParams.index_value
          }
        };

    if (eventParams.parent_type == 'classify') { // 如果是分类组件的分类项 需要更改当前选中元素的索引
      var classify_selected_index = {};
      classify_selected_index[eventParams.parent_comp_id + '.customFeature.selected'] = eventParams.item_index;
      pageInstance.setData(classify_selected_index);
    }

    compids_params.param.idx_arr = requestData.idx_arr;

    switch(eleType){
      case 'goods-list': this.refreshGoodsList(compids_params['compid'], requestData, pageInstance); break;
      case 'list-vessel': this.refreshListVessel(compids_params['compid'], requestData, pageInstance); break;
      case 'franchisee-list': this.refreshFranchiseeList(compids_params['compid'], requestData, pageInstance); break;
    }
  },
  refreshGoodsList: function(targetCompId, requestData, pageInstance){
    var _this = this;

    this.sendRequest({
      url: '/index.php?r=AppShop/GetGoodsList',
      method: 'post',
      data: requestData,
      success: function(res){
        var newData = {};

        newData[targetCompId + '.goods_data'] = res.data;
        newData[targetCompId + '.is_more'] = res.is_more;
        newData[targetCompId + '.curpage'] = 1;
        newData[targetCompId + '.scrollTop'] = 0;
        pageInstance.setData(newData);
      }
    })
  },
  refreshListVessel: function(targetCompId, requestData, pageInstance){
    var _this = this;

    this.sendRequest({
      url: '/index.php?r=AppData/getFormDataList',
      method: 'post',
      data: requestData,
      success: function (res) {
        var newData = {};
        for (let j in res.data) {
          for (let k in res.data[j].form_data) {
            if (k == 'category') {
              continue;
            }
            let description = res.data[j].form_data[k];
            if (!description) {
              continue;
            }
            // 检测如果不是一个图片链接的话就解析
            if(typeof description == 'string' && !/^http:\/\/img/g.test(description)){
              res.data[j].form_data[k] = _this.getWxParseResult(description);
            }
          }
        }
        newData[targetCompId + '.list_data'] = res.data;
        newData[targetCompId + '.is_more'] = res.is_more;
        newData[targetCompId + '.curpage'] = 1;
        newData[targetCompId + '.scrollTop'] = 0;
        pageInstance.setData(newData);
      }
    })
  },
  refreshFranchiseeList: function(targetCompId, requestData, pageInstance){
    var _this = this;

    this.sendRequest({
      url: '/index.php?r=AppShop/GetAppShopByPage',
      method: 'post',
      data: requestData,
      success: function (res) {
        var newData = {};

        for(let index in res.data){
          let distance = res.data[index].distance;
          res.data[index].distance = util.formatDistance(distance);
        }
        newData[targetCompId + '.franchisee_data'] = res.data;
        newData[targetCompId + '.is_more'] = res.is_more;
        newData[targetCompId + '.curpage'] = 1;
        newData[targetCompId + '.scrollTop'] = 0;
        pageInstance.setData(newData);
      }
    })
  },
  getAppTitle: function(){
    return this.globalData.appTitle;
  },
  getAppDescription: function(){
    return this.globalData.appDescription;
  },
  setLocationInfo: function(info){
    this.globalData.locationInfo = info;
  },
  getLocationInfo: function(){
    return this.globalData.locationInfo;
  },
  getSiteBaseUrl: function(){
    return this.globalData.siteBaseUrl;
  },
  getUrlLocationId:function(){
    return this.globalData.urlLocationId;
  },
  getPreviewGoodsInfo: function(){
    return this.globalData.previewGoodsOrderGoodsInfo;
  },
  setPreviewGoodsInfo: function(goodsInfoArr){
    this.globalData.previewGoodsOrderGoodsInfo = goodsInfoArr;
  },
  getGoodsAdditionalInfo: function(){
    return this.globalData.goodsAdditionalInfo;
  },
  setGoodsAdditionalInfo: function(additionalInfo){
    this.globalData.goodsAdditionalInfo = additionalInfo;
  },
  beforeSeckillDownCount : function(formData , page ,path) {
    let _this = this,
        downcount ;
    downcount = _this.seckillDownCount({
      startTime : formData.server_time,
      endTime : formData.seckill_start_time,
      callback : function() {
        let newData = {};
        newData[path+'.seckill_start_state'] = 1;
        newData[path+'.server_time'] = formData.seckill_start_time;
        page.setData(newData);
        formData.server_time = formData.seckill_start_time;
        _this.duringSeckillDownCount(formData , page ,path);
      }
    } , page , path + '.downCount');

    return downcount;
  },
  duringSeckillDownCount : function(formData , page ,path) {
    let _this = this,
        downcount;
    downcount = _this.seckillDownCount({
      startTime : formData.server_time,
      endTime : formData.seckill_end_time ,
      callback : function() {
        let newData = {};
        newData[path+'.seckill_start_state'] = 2;
        page.setData(newData);
      }
    } , page , path + '.downCount');

    return downcount;
  },
  seckillDownCount: function(opts , page , path) {
    let opt = {
                startTime : opts.startTime || null,
                endTime : opts.endTime || null,
                callback : opts.callback
              },
        systemInfo = this.systemInfo.system,
        isiphone = systemInfo.indexOf('iOS') != -1;

    if(isiphone && /\-/g.test(opt.endTime)){
      opt.endTime = opt.endTime.replace(/\-/g , '/');
    }
    if(isiphone && /\-/g.test(opt.startTime)){
      opt.startTime = opt.startTime.replace(/\-/g , '/');
    }
    if(/^\d+$/.test(opt.endTime)){
      opt.endTime = opt.endTime * 1000;
    }
    if(/^\d+$/.test(opt.startTime)){
      opt.startTime = opt.startTime * 1000;
    }

    let target_date = new Date(opt.endTime),
        current_date = new Date(opt.startTime),
        interval ,
        isfirst = true,
        difference = target_date - current_date;

    function countdown () {
        if (difference < 0) {
            clearInterval(interval);
            if (opt.callback && typeof opt.callback === 'function'){opt.callback();};
            return;
        }

        let _second = 1000,
            _minute = _second * 60,
            _hour = _minute * 60,
            time = {};

        let hours = Math.floor(difference / _hour),
            minutes = Math.floor((difference % _hour) / _minute),
            seconds = Math.floor((difference % _minute) / _second);

            hours = (String(hours).length >= 2) ? hours : '0' + hours;
            minutes = (String(minutes).length >= 2) ? minutes : '0' + minutes;
            seconds = (String(seconds).length >= 2) ? seconds : '0' + seconds;
        if(isfirst){
          time[path+'.hours'] = hours;
          time[path + '.minutes'] = minutes;
        }else{
          (minutes == '59' && seconds == '59') && (time[path+'.hours'] = hours);
          (seconds == '59') && (time[path + '.minutes'] = minutes);
        }
        time[path + '.seconds'] = seconds;

        page.setData(time);

        isfirst = false;
        difference -= 1000;
    };
    interval = setInterval(countdown, 1000);

    return {
      interval : interval ,
      clear : function() {
        clearInterval(interval);
      }
    };
  },

  globalData:{
    appId: '3j1MTbmDsG',
        tabBarPagePathArr: '["\/pages\/page10000\/page10000","\/pages\/page10002\/page10002","\/pages\/page10048\/page10048","\/pages\/page10049\/page10049"]',
        homepageRouter: 'page10000',
    firstPage:true,
    formData: null,
    userInfo: {},
    sessionKey: '',
    notBindXcxAppId: false,
    locationInfo: {
      latitude: '',
      longitude: '',
      address: ''
    },
    previewGoodsOrderGoodsInfo: [],
    goodsAdditionalInfo: {}, 
    urlLocationId:'',
    wxParseOldPattern: '_listVesselRichText_',
    cdnUrl: 'http://cdn.jisuapp.cn',
    defaultPhoto: 'http://cdn.jisuapp.cn/zhichi_frontend/static/webapp/images/default_photo.png',
    siteBaseUrl:'https://xcx.yingyonghao8.com',
    appTitle: '煦象',
    appDescription: '我的应用',
    appLogo: 'http://img.weiye.me/zcimgdir/album/file_59775c96659de.png'
  }
})

