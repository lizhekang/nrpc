"use strict";

const CALLTIMEOUT = {
    result: -8,
    msg: "Remote function call timeout."
};
const NOREMOTECLIENT = {
    result: -9,
    msg: "No remote client exist."
};
const REMOTEFUNCISNOTDEFINE = {
    result: -10,
    msg: "Remote function is not defined."
};
const NOREMOTECLIENTAVAIL = {
    result: -10,
    msg: "Remote clients are occupied."
};

export {
    CALLTIMEOUT,
    NOREMOTECLIENT,
    REMOTEFUNCISNOTDEFINE,
    NOREMOTECLIENTAVAIL
}