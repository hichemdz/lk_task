const axios = require("axios");
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");

// display errors
const errors = {
  currency: "Currency is not supported",
};

const removeSpaceStartAndEnd = (text) => text.trim().toLowerCase();

const rounded = (number) =>
  number.toString().length > 4
    ? Math.ceil((number + Number.EPSILON) * 100) / 100
    : number;

const getDayIndex = (d) => moment(d, "YYYY-MM-DD").tz("Europe/London").day();

const getWeekIndex = (d) => moment(d, "YYYY-MM-DD").tz("Europe/London").week();

const getYear = (d) => moment(d, "YYYY-MM-DD").tz("Europe/London").year();

const checkDaysInSameWeek = (d1, d2) => {
  if (getYear(d1) === getYear(d2) && getWeekIndex(d1) === getWeekIndex(d2)) {
    return true;
  }
  return false;
};

const isFirstweekday = (dayIndex) => (!getDayIndex(dayIndex) ? true : false);

const isCashOut = (cash) =>
  removeSpaceStartAndEnd(cash) === "cash_out" ? true : false;

const isCashOutNatural = (type) =>
  removeSpaceStartAndEnd(type) === "natural" ? true : false;

const fetchData = (api) => axios(api);

const calcCommission = (amount, percentage) =>
  rounded((amount * percentage) / 100);

const handelCachIn = (role, currency, amount) => {
  const { percents, max } = role.cashIn;
  if (currency === max.currency) {
    if (calcCommission(amount, percents) <= max.amount) {
      return calcCommission(amount, percents);
    } else {
      return max.amount;
    }
  } else {
    throw errors.currency;
  }
};

const getStayAmount = (date, user_id, isDiscount, stayAmount) => ({
  date,
  user_id,
  isDiscount,
  stayAmount,
});

const removeUser = (CashOutNaturalUsers, user_id) =>
  CashOutNaturalUsers.filter((user) => user?.user_id !== user_id);

const findUser = (CashOutNaturalUsers, user_id) =>
  CashOutNaturalUsers.find((user) => user?.user_id === user_id);

const handelAmountNatural = (
  CashOutNaturalUsers,
  date,
  user_id,
  amount,
  week_limit,
  percents
) => {
  if (amount <= week_limit.amount) {
    let amountC = week_limit.amount - amount;
    CashOutNaturalUsers.push(
      getStayAmount(date, user_id, !amountC ? false : true, amountC)
    );
    return 0;
  } else {
    CashOutNaturalUsers.push(getStayAmount(date, user_id, false, 0));
    return calcCommission(amount - week_limit.amount, percents);
  }
};

const handelCachJuridical = (currency, amount, percents, min) => {
  if (currency === min.currency) {
    if (calcCommission(amount, percents) >= min.amount) {
      return calcCommission(amount, percents);
    }
    return min.amount;
  } else {
    return "Currency is not supported";
  }
};

const handelCachOut = (
  role,
  date,
  user_type,
  amount,
  user_id,
  currency,
  CashOutNaturalUsers
) => {
  if (isCashOutNatural(user_type)) {
    const { percents, week_limit } = role.cachOutNaturalRule;
    if (week_limit.currency === currency) {
      let userData = findUser(CashOutNaturalUsers, user_id);

      if (!userData || isFirstweekday(date)) {
        if (userData) {
          removeUser(CashOutNaturalUsers, user_id);
        }
        return handelAmountNatural(
          CashOutNaturalUsers,
          date,
          user_id,
          amount,
          week_limit,
          percents
        );
      } else {
        if (!checkDaysInSameWeek(date, userData.date)) {
          removeUser(CashOutNaturalUsers, user_id);
          return handelAmountNatural(
            CashOutNaturalUsers,
            date,
            user_id,
            amount,
            week_limit,
            percents
          );
        } else {
          if (userData.isDiscount) {
            let disc = userData.stayAmount - amount;

            if (disc >= 0) {
              return calcCommission(disc, percents);
            } else {
              removeUser(CashOutNaturalUsers, user_id);
              CashOutNaturalUsers.push(
                getStayAmount(date, user_id, true, Math.abs(disc))
              );
              return 0;
            }
          } else {
            return calcCommission(amount, percents);
          }
        }
      }
    } else {
       throw errors.currency;
    }
  } else {
    const { percents, min } = role.cachOutjuridicalRule;
    return handelCachJuridical(currency, amount, percents, min);
  }
};

const handelData = async (data) => {
  var role = {}; // configuration
  var CashOutNaturalUsers = []; // Cash Out Natural Users in the week
  var result = [];
  fetchData("https://developers.paysera.com/tasks/api/cash-in")
    .then((res) => {
      role.cashIn = res.data;
    })
    .catch((e) => {throw e});

  await fetchData("https://developers.paysera.com/tasks/api/cash-out-natural")
    .then((res) => {
      role.cachOutNaturalRule = res.data;
    })
     .catch((e) => {throw e});

  await fetchData("https://developers.paysera.com/tasks/api/cash-out-juridical")
    .then((res) => {
      role.cachOutjuridicalRule = res.data;
    })
     .catch((e) => {throw e});

  data.map((item) => {
    const { date, user_id, user_type, type, operation } = item;
    const { amount, currency } = operation;

    if (isCashOut(type)) {
      result.push(
        handelCachOut(
          role,
          date,
          user_type,
          amount,
          user_id,
          currency,
          CashOutNaturalUsers
        )
      );
    } else {
      result.push(handelCachIn(role, currency, amount));
    }
  });

  return result;
};

const handelNodeCommand = (input) => {
  let splite = input.split(".");

  if (splite[splite.length - 1] === "json") {
    let filePath = path.join(__dirname, input);
    if (fs.existsSync(filePath)) {
      let data = require(filePath);
      let res = handelData(data);
      res
        .then((res) => {
          res.forEach((i) => {
            console.log(i);
          });
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      console.log("file not found");
    }
  } else {
    console.log("Only accepts JSON files");
  }
};

module.exports = {
  handelAmountNatural,
  handelNodeCommand,
  handelData,
  handelCachOut,
  handelCachJuridical,
  findUser,
  removeUser,
  rounded,
  getStayAmount,
  handelCachIn,
  calcCommission,
  fetchData,
  isCashOutNatural,
  isCashOut,
  getYear,
  isFirstweekday,
  getDayIndex,
  getWeekIndex,
};

/* ----------------------Commend line------------------------- */

let input = process.argv.slice(2);

input.forEach((input) => {
  handelNodeCommand(input);
});
