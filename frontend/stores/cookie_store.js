var Store = require('flux/utils').Store,
    AppDispatcher = require('../dispatcher/dispatcher'),
    LanguageStore = require('./language_store'),
    CourseStore = require('./course_store'),
    UsersApiUtil = require('../util/users_api_util'),
    CoursesApiUtil = require('../util/courses_api_util'),
    CookieConstants = require('../constants/cookie_constants');


var _cookiesHaveBeenFetched = false;

var _COOKIE_DEFAULTS = {
  curLng: "English",
  curCourseId: "",
  enrolledCourses: [],
  curCompletions: [],
  curPoints: 0
};

var _COOKIE_NAMES = {
  curLng: "curLng",
  curCourseId: "curCourseId",
  enrolledCourses: "enrolledCourses",
  curCompletions: "curCompletions",
  curPoints: "curPoints"
};

var _cookies = _COOKIE_DEFAULTS;

var CookieStore = new Store(AppDispatcher);


var addCookie = function (cookie) {
  var key = Object.keys(cookie)[0];

  if (!CurrentUserStore.isLoggedIn()) {
    var value = cookie[key];
    if (key === "curCompletions") {
      _cookies.curCompletions.push(value);
      json_cookie = JSON.stringify(_cookies.curCompletions);
      window.localStorage.setItem(key, json_cookie);
    } else if (key === "enrolledCourses") {
      _cookies.enrolledCourses.push(value);
      json_cookie = JSON.stringify(_cookies.enrolledCourses);
      window.localStorage.setItem(key, json_cookie);
    } else if (key === "curCourseId"){
      _cookies[key] = cookie[key];
      window.localStorage.setItem(key, cookie[key]);
    } else if (key === "curPoints") {
      _cookies[key] += parseInt(cookie[key]);
      window.localStorage.setItem(key, _cookies[key]);
    }
  }

  if (key === "curCourseId" && CurrentUserStore.isLoggedIn())  {
    UsersApiUtil.updateUser({ current_course_id: cookie[key] });
    window.localStorage.setItem(key, cookie[key]);
  } else if (key === "curLng") {
    _cookies[key] = cookie[key];
    var lang = LanguageStore.findByName(cookie[key]);
    UsersApiUtil.updateUser({ current_language_id: lang.id });
    window.localStorage.setItem(key, cookie[key]);
  }
};

var fetchCookiesFromBrowser = function () {
  Object.keys(localStorage).forEach(function (key) {
    if (_COOKIE_NAMES[key]) {
      if (key === "curCompletions") {
        if (localStorage.curCompletions) {
          _cookies.curCompletions = JSON.parse(localStorage.curCompletions);
        }
      } else if (key === "enrolledCourses") {
          if(localStorage.enrolledCourses) {
            _cookies.enrolledCourses = JSON.parse(localStorage.enrolledCourses);
          }
      } else if (key === "curPoints") {
        _cookies[key] = parseInt(localStorage[key]);
      } else {
        _cookies[key] = localStorage[key];
      }
    }
  });
};

var receiveCookies = function (cookies) {
  var keys = Object.keys(cookie);
  keys.forEach(function (key, idx) {
    if (key === "curCourseId") {
      _cookies[key] = cookie[key];
      window.localStorage.setItem(key, cookie[key]);
      UsersApiUtil.updateUser({ current_course_id: cookie[key] });
    } else if (key === "curLng") {
      _cookies[key] = cookie[key];
      window.localStorage.setItem(key, cookie[key]);
      var lang = LanguageStore.findByName(cookie[key]);
      UsersApiUtil.updateUser({ current_language_id: lang.id });
    }
  }.bind(this));
};

var clearCookies = function () {
  _cookies = {curLng: "English", curCourseId: "", curCompletions: [], enrolledCourses: [] };
  localStorage.setItem("curLng", "English");
  localStorage.setItem("curCourseId", "");
  localStorage.setItem("curCompletions", []);
  localStorage.setItem("enrolledCourses", []);
  localStorage.setItem("curPoints", 0);
};

var clearCookie = function (cookieName) {
  _cookies[cookieName] = _COOKIE_DEFAULTS[cookieName];
  localStorage.setItem(cookieName, _COOKIE_DEFAULTS[cookieName]);
};

CookieStore.all = function () {
  return Object.assign({}, _cookies);
};

CookieStore.getCurCourse = function () {
  var course = CourseStore.find(_cookies.curCourseId);
  if (course) {
    return course;
  } else if (_cookies.curCourseId) {
    CoursesApiUtil.fetchCourse(_cookies.curCourseId, function (fetchedCourse) {
      course = fetchedCourse;
    }.bind(this));
  }

  return course;
};

CookieStore.curLng = function () {
  return _cookies.curLng;
};

CookieStore.curCourse = function () {
  return _cookies.curCourseId;
};

CookieStore.curPoints = function () {
  return _cookies.curPoints;
};

CookieStore.cookiesHaveBeenFetched = function () {
  return _cookiesHaveBeenFetched;
};

CookieStore.curCompletions = function () {
  return _cookies.curCompletions;
};

CookieStore.enrolledCourses = function () {
  return _cookies.enrolledCourses;
};

CookieStore.findCompletionByTypeAndID = function (type, id) {
  var completions = CookieStore.curCompletions(),
      result;
  completions.forEach(function (completion) {
    var completionType = completion.completionType,
        completionId = completion.completionId;
    if (completionType === type && completionId === id) {
      result = completion;
    }
  }.bind(this));

  return result;
};

CookieStore.__onDispatch = function (payload) {
  if (payload.actionType === CookieConstants.COOKIES_RECEIVED) {
    var cookies = payload.cookies;
    receiveCookies(cookies);
    CookieStore.__emitChange();
  } else if (payload.actionType === CookieConstants.COOKIE_RECEIVED) {
    var cookie = payload.cookie;
    addCookie(cookie);
    CookieStore.__emitChange();
  } else if (payload.actionType === CookieConstants.FETCH_COOKIES) {
    _cookiesHaveBeenFetched = true;
    fetchCookiesFromBrowser();
    CookieStore.__emitChange();
  } else if (payload.actionType === CookieConstants.CLEAR_COOKIES) {
    clearCookies();
    CookieStore.__emitChange();
  } else if (payload.actionType === CookieConstants.CLEAR_COOKIE) {
    clearCookie(payload.cookieName);
    CookieStore.__emitChange();
  }
};

window.CookieStore = CookieStore;

module.exports = CookieStore;
