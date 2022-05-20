const {
  handelAmountNatural,
  handelData,
  handelCachOut,
  handelCachJuridical,
  findUser,
  removeUser,
  getStayAmount,
  handelCachIn,
  calcCommission,
  isCashOutNatural,
  isCashOut,
  rounded,
  isFirstweekday,
  getDayIndex,
  getWeekIndex,
  getYear,
} = require("../app");

const role = {};
const errors = {
    currency: "Currency is not supported",
  };
role.cashIn = {
  percents: 0.03,
  max: {
    amount: 5,
    currency: "EUR",
  },
};

role.cachOutNaturalRule = {
  percents: 0.3,
  week_limit: { amount: 1000, currency: "EUR" },
};
role.cachOutjuridicalRule = {
  percents: 0.3,
  min: { amount: 0.5, currency: "EUR" },
};

const CashOutNaturalUsers = [
  {
    date: "2016-6-05",
    user_id: 1,
    isDiscount: false,
    stayAmount: 0,
  },
  {
    date: "2016-6-03",
    user_id: 2,
    isDiscount: false,
    stayAmount: 0,
  },
];

const CashOutNaturalUsers2 = [
  { date: "2016-01-06", user_id: 1, isDiscount: false, stayAmount: 0 },
];

test("year of date", () => {
  expect(getYear("2016-6-05")).toEqual(2016);
});

test("week index ", () => {
  expect(getWeekIndex("2016-6-05")).toEqual(24);
});

test("day index", () => {
  expect(getDayIndex("2016-6-05")).toEqual(0);
});

test("first day of week", () => {
  expect(isFirstweekday("2016-6-05")).toBeTruthy();
  expect(isFirstweekday("2016-6-04")).toBeFalsy();
});

test("rounded to upper", () => {
  expect(rounded(0.023)).toEqual(0.03);
  expect(rounded(0.6)).toEqual(0.6);
  expect(rounded(0.6)).toEqual(0.6);
  expect(rounded(0.061)).toEqual(0.07);
  expect(rounded("0.061")).not.toEqual(0.07);
});

test("is Cash Out", () => {
  expect(isCashOut("cash_out")).toBeTruthy();
  expect(isCashOut("cash_out ")).toBeTruthy();
  expect(isCashOut("cash_out ")).toBeTruthy();
  expect(isCashOut(" cAsh_out ")).toBeTruthy();
  expect(isCashOut("cash_in")).toBeFalsy();
});

test("is Cash in", () => {
  expect(isCashOutNatural("natural")).toBeTruthy();
  expect(isCashOutNatural("Natural ")).toBeTruthy();
  expect(isCashOutNatural(" Natural")).toBeTruthy();
  expect(isCashOutNatural(" Natural ")).toBeTruthy();
  expect(isCashOutNatural("juridical")).toBeFalsy();
});

test("commission", () => {
  expect(calcCommission(200.0, 0.03)).toEqual(0.06);
});

test("get Stay amount", () => {
  const ob = {
    date: "2016-6-05",
    user_id: 1,
    isDiscount: false,
    stayAmount: 0,
  };
  expect(getStayAmount("2016-6-05", 1, false, 0)).toEqual(ob);
});

test("remove user", () => {
  expect(removeUser(CashOutNaturalUsers, 2)).toEqual([
    {
      date: "2016-6-05",
      user_id: 1,
      isDiscount: false,
      stayAmount: 0,
    },
  ]);
});

test("find user", () => {
  expect(findUser(CashOutNaturalUsers, 1)).toEqual({
    date: "2016-6-05",
    user_id: 1,
    isDiscount: false,
    stayAmount: 0,
  });
});

test("handelCachIn", () => {
  expect(handelCachIn(role, "EUR", 200.0)).toEqual(0.06);
  expect(handelCachIn(role, "EUR", 9999999999)).toEqual(5);
  expect(() => handelCachIn(role, "EU", 9999999999)).toThrow();
});

test("handelCachJuridical", () => {
  const { percents, min } = role.cachOutjuridicalRule;
  expect(handelCachJuridical("EUR", 300.0, percents, min)).toEqual(0.9);
});

test("handelAmountNatural", () => {
  const { percents, week_limit } = role.cachOutNaturalRule;
  expect(
    handelAmountNatural(
      CashOutNaturalUsers2,
      "2016-01-06",
      1,
      30000,
      week_limit,
      percents
    )
  ).toEqual(87);
});

test("handelCachOut", () => {
  expect(
    handelCachOut(
      role,
      "2016-01-06",
      "juridical",
      300.0,
      2,
      "EUR",
      CashOutNaturalUsers2
    )
  ).toEqual(0.9);
});

var data = require("../input.json");

it("handelData", () => {
  let result = [0.06, 0.9, 87, 3, 0.3, 0.3, 5, 0, 0];
  handelData(data).then(res=>{
      expect(res).toEqual(result);
  }).catch(err=>{
    expect(err).toThrow(errors.currency);
  })
});


