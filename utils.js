function randomStr(len, arr) {
  let ans = "";
  ans.length;
  for (let i = len; i > 0; i--) {
    ans += arr[Math.floor(Math.random() * arr.length)];
  }
  console.log(ans);
}

function checkRoomId(id) {
  return id?.length === 10;
}

function checkName(name) {
  return name?.length >= 3;
}

module.exports.checkName = checkName;
module.exports.checkRoomId = checkRoomId;

module.exports.randomStr = randomStr;
