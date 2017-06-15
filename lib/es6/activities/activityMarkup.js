"use strict";

/* jshint -W061 */

let _ = require("lodash");
let errors = require("../common/errors");
let Activity = require("./activity");
let is = require("../common/is");
let path = require("path");
let fs = require("fs");
let Reflection = require("backpack-node").system.Reflection;
let templateHelpers = require('./templateHelpers');
let activities = require('./index');

const activityTypeNameRex = /^\@([a-zA-Z_]+[0-9a-zA-Z_]*)$/;
function getActivityTypeName(str) {
    if (_.isString(str)) {
        let result = activityTypeNameRex.exec(str);
        if (result && result.length === 2) {
            return result[1];
        }
    }
    return null;
}

function requireFromRoot(resource) {
    try {
        return require(resource);
    }
    catch (e) {
        _.noop(e);
    }
    let pPos = resource.indexOf("/");
    if (pPos === -1) {
        return require(resource);
    }
    let module = resource.substr(0, pPos);
    if (!module) {
        return require(resource);
    }
    try {
        module = require(module);
        let obj = module;
        for (let key of resource.substr(pPos + 1).split("/")) {
            obj = obj[key];
        }
        return obj;
    }
    catch (e) {
        return require(resource);
    }
}

function ActivityMarkup() {
    this._systemTypes = new Map();
    this._registerSystemTypes();
}

ActivityMarkup.prototype._registerSystemTypes = function () {
    this._registerTypes(activities);
};

ActivityMarkup.prototype._registerTypes = function (source) {
    this._registerTypesTo(this._systemTypes, source);
};

ActivityMarkup.prototype._registerTypesTo = function (types, source) {
    let self = this;
    let obj;
    if (typeof source === 'object') {
        obj = source;
    } else {
        obj = requireFromRoot(source);
    }
    Reflection.visitObject(obj, function (inObj) {
        let alias = self.getAlias(inObj);
        if (alias && !types.has(alias)) {
            // This is an activity type
            types.set(alias, inObj);
        }
        return alias === null;
    });
};

ActivityMarkup.prototype.getAlias = function (type) {
    if (_.isFunction(type) && !_.isUndefined(type.super_)) {
        let alias = this._toCamelCase(type.name);
        do
        {
            if (type.super_ === Activity) {
                return alias;
            }
            type = type.super_;
        }
        while (type);
    }
    return null;
};

ActivityMarkup.prototype._toCamelCase = function (id) {
    return id[0].toLowerCase() + id.substr(1);
};

ActivityMarkup.prototype.parse = function (markup) {
    if (!markup) {
        throw new TypeError("Parameter 'markup' expected.");
    }
    if (_.isString(markup)) {
        markup = JSON.parse(markup);
    }
    if (!_.isPlainObject(markup)) {
        throw new TypeError("Parameter 'markup' is not a plain object.");
    }

    let types = new Map();
    for (let kvp of this._systemTypes.entries()) {
        types.set(kvp[0], kvp[1]);
    }
    let req = markup["@require"];
    if (req) {
        this._require(types, req);
    }
    let activity = this._createActivity(types, markup);
    if (req) {
        activity["@require"] = req;
    }
    return activity;
};

ActivityMarkup.prototype._createActivity = function (types, markup) {
    let filedNames = _.filter(_.keys(markup), function (k) { return k !== "@require"; });
    if (filedNames.length !== 1) {
        throw new errors.ActivityMarkupError("There should be one field." + this._errorHint(markup));
    }

    let activityAlias = getActivityTypeName(filedNames[0]);
    if (activityAlias) {
        return this._createAndInitActivityInstance(types, activityAlias, markup);
    }
    else {
        throw new errors.ActivityMarkupError("Root entry is not an activity type name '" + filedNames[0] + "'." + this._errorHint(markup));
    }
};

ActivityMarkup.prototype._createAndInitActivityInstance = function (types, typeName, markup) {
    let activity = this._createActivityInstance(types, typeName);
    if (!activity) {
        throw new errors.ActivityMarkupError("Unknown activity type name '" + typeName + "'." + this._errorHint(markup));
    }
    let activityRef = {
        name: typeName,
        value: activity
    };
    let pars = markup["@" + typeName];
    if (pars) {
        this._setupActivity(types, activityRef, pars);
    }
    return activityRef.value;
};

ActivityMarkup.prototype._createActivityInstance = function (types, alias) {
    let Constructor = types.get(alias);
    if (_.isUndefined(Constructor)) {
        return null;
    }
    return new Constructor();
};

ActivityMarkup.prototype._setupActivity = function (types, activityRef, pars) {
    let self = this;
    let activity = activityRef.value;

    function noFunction(fieldName) {
        return activity.codeProperties.has(fieldName);
    }

    if (_.isArray(pars)) {
        // args
        activity.args = [];
        for (let obj of pars) {
            activity.args.push(self._createValue(types, obj, false, is.template(activity)));
        }
    }
    else if (_.isObject(pars)) {
        let to = null;
        // values
        for (let fieldName in pars) {
            if (pars.hasOwnProperty(fieldName)) {
                if (activity.isArrayProperty(fieldName)) {
                    let v = self._createValue(types, pars[fieldName], true, is.template(activity));
                    if (!_.isArray(v)) {
                        v = [v];
                    }
                    activity[fieldName] = v;
                }
                else if (fieldName === "@to") {
                    if (to) {
                        throw new errors.ActivityMarkupError("Multiple to defined in activity '" + activityRef.name + "." + this._errorHint(pars));
                    }
                    to = pars[fieldName];
                }
                else if (fieldName[0] === "!") {
                    // Promoted:
                    if (!activity.promotedProperties || !_.isFunction(activity.promoted)) {
                        throw new errors.ActivityMarkupError("Activity '" + activityRef.name + " cannot have promoted properties." + this._errorHint(pars));
                    }
                    activity.promoted(fieldName.substr(1), self._createValue(types, pars[fieldName], true, is.template(activity)));
                }
                else if (fieldName[0] === "`") {
                    // Reserved:
                    if (!activity.reservedProperties || !_.isFunction(activity.reserved)) {
                        throw new errors.ActivityMarkupError("Activity '" + activityRef.name + " cannot have reserved properties." + this._errorHint(pars));
                    }
                    activity.reserved(fieldName.substr(1), self._createValue(types, pars[fieldName], true, is.template(activity)));
                }
                else if (fieldName === "@require") {
                    // Require:
                    self._require(types, pars[fieldName]);
                }
                else {
                    activity[fieldName] = self._createValue(types, pars[fieldName], false, is.template(activity), noFunction(fieldName));
                }
            }
        }
        if (to) {
            let current = activity;
            let assign = activityRef.value = this._createActivityInstance(types, "assign");
            assign.value = current;
            assign.to = to;
        }
    }
    else {
        // 1 arg
        activity.args = [self._createValue(types, pars, false, is.template(activity))];
    }
};

ActivityMarkup.prototype._require = function (types, markup) {
    let self = this;

    if (_.isArray(markup)) {
        for (let item of markup) {
            self._require(types, item);
        }
    }
    else if (_.isString(markup)) {
        self._registerTypesTo(types, markup);
    }
    else {
        throw new errors.ActivityMarkupError("Cannot register '" + markup + "'." + self._errorHint(markup));
    }
};

ActivityMarkup.prototype._createValue = function (types, markup, canBeArray, noTemplate, noFunction) {
    let self = this;

    // Helpers
    function toTemplate(_markup) {
        let template = self._createActivityInstance(types, "template");
        template.declare = _markup;
        return template;
    }

    function toFunc(f) {
        let func = self._createActivityInstance(types, "func");
        func.code = f;
        return func;
    }

    function toExpression(str) {
        let expr = self._createActivityInstance(types, "expression");
        expr.expr = str;
        return expr;
    }

    if (_.isArray(markup)) {
        if (canBeArray) {
            let result = [];
            for (let v of markup) {
                result.push(self._createValue(types, v));
            }
            return result;
        }
        else if (!noTemplate && templateHelpers.isTemplate(markup)) {
            return toTemplate(markup);
        }
    }
    else if (_.isPlainObject(markup)) {
        let filedNames = _.keys(markup);
        if (filedNames.length === 1) {
            let fieldName = filedNames[0];
            let fieldValue = markup[fieldName];

            if (fieldName === "_") {
                // Escape:
                return fieldValue;
            }

            let activityTypeName = getActivityTypeName(fieldName);
            if (activityTypeName) {
                // Activity:
                return self._createAndInitActivityInstance(types, activityTypeName, markup);
            }
        }

        // Plain object:
        if (!noTemplate && templateHelpers.isTemplate(markup)) {
            return toTemplate(markup);
        }
    }
    else if (_.isString(markup)) {
        let str = markup.trim();
        if (templateHelpers.isFunctionString(str)) {
            let f;
            eval("f = function(_){return (" + str + ");}");
            f = f(_);
            if (!noFunction) {
                return toFunc(f);
            }
            else {
                return f; // aka when func.code
            }
        }
        else if (str.length > 1) {
            if (str[0] === "=") {
                // Expression
                return toExpression(str.substr(1));
            }
        }
    }
    else if (_.isFunction(markup)) {
        if (!noFunction) {
            return toFunc(markup);
        }
    }

    return this._clone(markup);
};

ActivityMarkup.prototype._clone = function(obj) {
    return templateHelpers.cloneDeep(obj);
};

ActivityMarkup.prototype._errorHint = function (markup) {
    let len = 20;
    let json = JSON.stringify(markup);
    if (json.length > len) {
        json = json.substr(0, len) + " ...";
    }
    return "\nSee error near:\n" + json;
};

ActivityMarkup.prototype.stringify = function (obj) {
    if (_.isString(obj)) {
        return obj;
    }
    if (is.activity(obj)) {
        obj = this.toMarkup(obj);
    }
    if (!_.isPlainObject(obj)) {
        throw new TypeError("Parameter 'obj' is not a plain object.");
    }
    let cloned = _.cloneDeep(obj);
    this._functionsToString(cloned);
    return JSON.stringify(cloned);
};

ActivityMarkup.prototype._functionsToString = function (obj) {
    let self = this;
    for (let fieldName in obj) {
        let fieldValue = obj[fieldName];
        if (_.isFunction(fieldValue)) {
            obj[fieldName] = fieldValue.toString();
        }
        else if (_.isObject(fieldValue)) {
            self._functionsToString(fieldValue);
        }
        else if (_.isArray(fieldValue)) {
            for (let v of fieldValue) {
                self._functionsToString(v);
            }
        }
    }
};

// To Markup:

ActivityMarkup.prototype.toMarkup = function (activity) {
    /*if (!is.activity(activity)) {
        throw new TypeError("Argument is not an activity instance.");
    }
    let markup = {};
    let alias = this.getAlias(activity.constructor);
    let activityMarkup = this._createMarkupOfActivity(activity);*/
    throw new Error("Not supported yet!");
};

// Exports:

let activityMarkup = null;

module.exports = {

    registerTypes: function(path) {
      return (activityMarkup = (activityMarkup || new ActivityMarkup()))._registerTypes(path);
    },

    parse: function (markup) {
        return (activityMarkup = (activityMarkup || new ActivityMarkup())).parse(markup);
    },

    toMarkup: function (activity) {
        return (activityMarkup = (activityMarkup || new ActivityMarkup())).toMarkup(activity);
    },

    stringify: function (obj) {
        return (activityMarkup = (activityMarkup || new ActivityMarkup())).stringify(obj);
    },

    getAlias: function (activity) {
        return (activityMarkup = (activityMarkup || new ActivityMarkup())).getAlias(activity.constructor);
    }
};
