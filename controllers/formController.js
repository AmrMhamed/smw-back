const { default: mongoose } = require("mongoose");
const Form = require("../models/formModel");
const Print = require("../models/printedNumberModel.js");
const Log = require("../models/logsModel");
const IP = require("ip");
const os = require("os");
const Class = require("../models/classModel");

const editForm = async (req, res) => {
  if (!req.user.admin && (!req.user.role || req.user.role.includes("edit")))
    return res.status(400).json("user is not authorized");
  if (!req.params.id) return res.status(400).json("id is not valid");
  if (mongoose.isValidObjectId(req.params.id)) {
    try {
      const form = await Form.findById(req.params.id);
      if (form.createdBy != req.user._id && !req.user.admin)
        return res.status(400).json("you are not authorized");
      if (!form) return res.status(400).json("there is no such form");
      console.log(req.body.note)
      let test = await Form.findByIdAndUpdate(req.params.id, {
        assignDate: req.body.assignDate || form.assignDate,
        area: req.body.area || form.area,
        pieceNumber: req.body.pieceNumber || form.pieceNumber,
        addressNubmer: req.body.addressNubmer || form.addressNubmer,
        department: req.body.department || form.department,
        paperNumber: req.body.paperNumber || form.paperNumber,
        recordNumber: req.body.recordNumber || form.recordNumber,
        husbandName: req.body.husbandName || form.husbandName,
        motherName: req.body.motherName || form.motherName,
        classType: req.body.classType || form.classType,
        birthDate: req.body.birthDate || form.birthDate,
        birthPlace: req.body.birthPlace || form.birthPlace,
        fullName: req.body.fullName || form.fullName,
        beneficiary: req.body.beneficiary || form.beneficiary,
        note: req.body.note || form.note,
      });
      // console.log("re", test);
      if (req.body.department) {
        const temp = await Class.findOne({
          name: req.body.department,
          type: "address",
        });
        if (!temp) {
          await Class.create({
            name: req.body.department,
            type: "address",
          });
        }
      }
      if (req.body.classType) {
        const temp2 = await Class.findOne({
          name: req.body.classType,
          type: "classType",
        });
        if (!temp2) {
          await Class.create({
            name: req.body.classType,
            type: "classType",
          });
        }
      }
      let fullName = req.body.fullName || form.fullName;
      if (!req.user.hidden) {
        await Log.create({
          type: "تعديل",
          user: req.user.name,
          details: `تعديل استمارة:${fullName}`,
          system: os.platform(),
          ip: IP.address(),
        });
      }
      console.log("done");
      return res.status(200).json("form updated");
    } catch (error) {
      return res.status(400).json(error);
    }
  } else {
    return res.status(400).json("id is not valid");
  }
};
const XLS = require("xlsx");

const createForm = async (req, res) => {
  if (!req.user.admin && !req.user.role.includes("add"))
    return res.status(400).json("user is not authorized");

  if (req.file) {
    try {
      let workbook = XLS.read(req.file.buffer);
      let data = [];

      const sheets = workbook.SheetNames;

      // let size = await Form.find({}).sort({ formNumber: -1 }),
      //   num;

      // !size.length ? (num = 1) : (num = size[0].formNumber * 1 + 1);
      for (let i = 0; i < sheets.length; i++) {
        const temp = XLS.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[i]]
        );
        temp.forEach((res) => {
          let tmp = {};
          tmp.fullName = res["الاسم الكامل"];
          tmp.birthPlace = res["مسقط الراس"];
          tmp.birthDate = res["المواليد"];
          tmp.classType = res["الشريحه"];
          tmp.husbandName = res["اسم الزوج"];
          tmp.recordNumber = res["رقم السجل"];
          tmp.paperNumber = res["رقم الصحيفه"];
          tmp.department = res["دائرة الاحوال"];
          tmp.pieceNumber = res["رقم القطعه"];
          tmp.addressNubmer = res["المقاطعه"];
          tmp.area = res["المساحه"];
          tmp.assignDate = res["تاريخ التخصيص"];
          tmp.beneficiary = true;// res["مستفيد"]?.includes("مستفيد")?true:false ;
          tmp.formNumber = res["رقم معرف"];
          tmp.note = res["الملاحظه"];
          data.push(tmp);
        });
      }
      console.log(" file length ", data.length);

      try {
        Form.insertMany(data);
      } catch (err) {
        console.log(err);
      }
    } catch (err) {
      return res.status(400).json(err);
    }
    return res.json("x");
  }

  let {
    assignDate,
    area,
    pieceNumber,
    addressNubmer,
    department,
    paperNumber,
    recordNumber,
    husbandName,
    husbandName2,
    motherName,
    classType,
    birthDate,
    birthPlace,
    fullName,
    beneficiary,
    note
  } = req.body;
  // if (!req.body.fullName && !req.file)
  //   return res.status(400).json("data is not completed");
  console.log(req.body);


  try {
    let sz = await Form.aggregate([
      {
        $project: {
          formNumber: {
            $toInt: "$formNumber"
          }
        }
      },
      {
        $sort: {
          formNumber: -1
        }
      },{
        $limit:1
      }
    ]);
    const numbers = await Print.find({}).sort({ number: -1 }).limit(1);
    //   console.log(forms)

    if (department) {
      Class.findOneAndUpdate(
        {
          name: department,
          type: "address",
        },
        {
          $setOnInsert: { name: department, type: "address" },
        },
        { upsert: true }
      );
    }
    if (classType) {
      //      const temp2 = await Class.findOne({ name: classType, type: "classType" });
      Class.findOneAndUpdate(
        {
          name: department,
          type: "classType",
        },
        {
          $setOnInsert: { name: department, type: "classType" },
        },
        { upsert: true }
      );
    }

    let tmp = await Form.create({
      assignDate,
      area,
      pieceNumber,
      addressNubmer,
      department,
      paperNumber,
      recordNumber,
      husbandName,
      husbandName2,
      motherName,
      classType,
      birthDate,
      birthPlace,
      fullName,
      formNumber: sz[0] ? sz[0].formNumber * 1 + 1 : 1,
      beneficiary: req.body.b ? false : true,
      createdBy: req.user.fullName,
      note
    });
    tmp.number = numbers[0].number - 1;
    if (!req.file && !req.user.hidden) {
      Log.create({
        type: "اضافه استماره",
        user: req.user.name,
        details: `أضافة استمارة جديد تحت اسم:${fullName}`,
        system: os.platform(),
        ip: IP.address(),
      });
    } else if (!req.user.hidden) {
      Log.create({
        type: "اضافه ملف excel",
        user: req.user.name,
        details: `اضافه ملف اكسل جديد`,
        system: os.platform(),
        ip: IP.address(),
      });
    }
    // console.log("tmm");
    // console.log(tmp._id);
    return res.status(200).json(tmp);
  } catch (err) {
    console.log(err);
    return res.status(400).json(err);
  }
};

const getForms = async (req, res) => {
  console.log(req.query.page, 'kkkkkkkkkk');
  let page = req.query.page;
  //   let limit = req.query.limit ;
  let start = page ? (page - 1) * 30 : 0;
  let end = page * 30;
  try {
    let data = await Form.find({}).sort({ formNumber: 1 }).skip(start).limit(30);
    let sz = await Form.aggregate([
      {
        $project: {
          formNumber: {
            $toInt: "$formNumber"
          }
        }
      },
      {
        $sort: {
          formNumber: -1
        }
      },{
        $limit:1
      }
    ]);
    return res.status(200).json({ len: sz[0] ? sz[0].formNumber : 1, data: data });

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(400).json(error);
  }
};
const deleteAll = async (req, res) => {
  try {
    await Form.deleteMany({ beneficiary: false })
    return res.status(200).json('deleted')
  } catch (e) {
    console.log(e)
    return res.status(400).json(e);
  }
}
const getMostafidForms = async (req, res) => {
  let page = req.query.page;
  let start = page ? (page - 1) * 30 : 0;
  let end = page * 30;
  try {
    let sz = await Form.aggregate([
      {
        $project: {
          formNumber: {
            $toInt: "$formNumber"
          }
        }
      },
      {
        $sort: {
          formNumber: -1
        }
      }, {
        $limit: 1
      }
    ]);

    let data = await Form.find({ beneficiary: true }).sort({ createdAt: -1 }).skip(start).limit(30);
    if (!page) {
      data = await Form.find({});
    }
    return res.status(200).json({ len: sz[0] ? sz[0].formNumber : 1, data: data });

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(400).json(error);
  }
};
const getMshMostafidForms = async (req, res) => {
  // console.log(req.query.page,'kkkkkkkkkk');
  let page = req.query.page;
  //   let limit = req.query.limit ;
  let start = page ? (page - 1) * 30 : 0;
  let end = page * 30;
  try {
    let data = await Form.find({ beneficiary: false }).sort({ createdAt: -1 }).skip(start).limit(30);
    let sz = await Form.aggregate([
      {
        $project: {
          formNumber: {
            $toInt: "$formNumber"
          }
        }
      },
      {
        $sort: {
          formNumber: -1
        }
      }, {
        $limit: 1
      }
    ]);
    return res.status(200).json({ len: sz[0] ? sz[0].formNumber : 1, data: data });

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(400).json(error);
  }
};

const deleteForm = async (req, res) => {
  console.log(req.user)
  if (!req.user.admin && !req.user.role.includes("delete"))
    return res.status(400).json("user is not authorized");

  if (mongoose.isValidObjectId(req.params.id)) {
    const form = await Form.findById(req.params.id);

    try {
      await Form.findByIdAndRemove(req.params.id);
      if (!req.user.hidden) {
        await Log.create({
          type: "حذف",
          user: req.user.name,
          details: `مسح استمارة تحت اسم :${form.fullName}`,
          system: os.platform(),
          ip: IP.address(),
        });
      }
      return res.status(200).json("done");
    } catch (error) {
      return res.status(400).json(error);
    }
  } else {
    return res.status(400).json("id is not valid");
  }

};

const getMyForms = async (req, res) => {
  console.log(String(req.params.id));
  try {
    const numbers = await Print.find({}).sort({ number: -1 }).limit(1);
    // console.log(numbers[0].number)
    const forms = await Form.findById(req.params.id);
    //   console.log(forms)
    forms.number = numbers[0].number - 1;
    return res.status(200).json(forms);

  } catch (error) {
    console.log('errx', error);
    return res.status(400).json(error);
  }
};

const getNumberOfForms = async (req, res) => {
  console.log("dsk");
  return res.status(200).json(2);
  try {
    const result = await Form.find({});
    console.log("xss", result.length);
    return res.status(200).json(result.length + 1);
  } catch (error) {
    console.log(error);
    return res.status(400).json(error);
  }
};

const filter = async (req, res) => {
  let page = req.query.page || 1;
  let start = (page - 1) * 30;
  let end = 30;
  let searchType = req.body.searchType;
  let searchValue = req.body.searchValue;
  try {
    let filterData = []
    if (req.body.searchType == "fullName") {
      filterData = await Form.find({ "fullName": { $regex: searchValue } }).sort({ createdAt: -1 }).skip(start).limit(end);
    }
    if (req.body.searchType == "assignDate") {
      filterData = await Form.find({ "assignDate": { $regex: searchValue } }).sort({ createdAt: -1 }).skip(start).limit(end);
    }
    if (req.body.searchType == "formNumber") {
      filterData = await Form.find({ "formNumber": searchValue }).sort({ createdAt: -1 }).skip(start).limit(end);
    }
    if (req.body.searchType == "husbandName") {
      filterData = await Form.find({ "husbandName": { $regex: searchValue } }).sort({ createdAt: -1 }).skip(start).limit(end);
    }
    return res.status(200).json(filterData);
  } catch (error) {
    res.status(400).json(error);
  }
};
const getForms2 = async (req, res) => {
  console.log("xxxzzz", req.query.page, req.body);
  let page = req.query.page;
  let start = (page - 1) * 30 || 0;
  let { search } = req.body;
  try {
    let response = [];
    if (
      req.body.search &&
      req.body.search != "" &&
      Object.keys(req.body.search).length != 0
    ) {
      await Form.find({
        $or: [
          { "husbandName": { $regex: search } }
          ,
          { "fullName": { $regex: search } },
          { "area": { $regex: search } },
          { "assignDate": { $regex: search } },
          { "formNumber": { $regex: search } },
          { "pieceNumber": { $regex: search } },
          { "department": { $regex: search } },
          { "paperNumber": { $regex: search } },
          { "recordNumber": { $regex: search } },
          { "motherName": { $regex: search } },
          { "classType": { $regex: search } },
          { "addressNubmer": { $regex: search } },
          { "birthPlace": { $regex: search } },
        ],
      }).sort({ createdAt: -1 })
        .skip(start)
        .limit(page * 30).then((data) => {
          for (let i = 0; i < data.length; ++i) {
            if (data[i]["husbandName"]?.includes(search) || data[i]["fullName"]?.includes(search) || data[i]["area"]?.includes(search) ||
              data[i]["assignDate"]?.includes(search) || data[i]["formNumber"]?.includes(search) || data[i]["pieceNumber"]?.includes(search) ||
              data[i]["department"]?.includes(search) || data[i]["paperNumber"]?.includes(search) || data[i]["recordNumber"]?.includes(search) ||
              data[i]["motherName"]?.includes(search) || data[i]["classType"]?.includes(search) || data[i]["birthPlace"]?.includes(search))
              response.push(data[i])
          }
          // response = data
        });
    } else {
      response = await Form.find({})
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(page * 30);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    return res.status(400).json(error);
  }
};

const editPrintNumber = async (req, res) => {
  console.log(req.body)
  if (!req.body.id || !req.body.number) return res.status(400).json("id is not valid");
  try {
    await Print.findOneAndUpdate({ number: req.body.number }, { number: req.body.number + 1 })
    let data = await Form.findByIdAndUpdate(req.body.id, { number: req.body.number });
    data.number = req.body.number
    return res.status(200).json(data)
  }
  catch (e) {
    return res.status(500).json(e);
  }
}

module.exports = {
  createForm,
  getForms,
  editForm,
  deleteForm,
  getMyForms,
  getNumberOfForms,
  filter,
  getForms2,
  editPrintNumber,
  getMostafidForms,
  getMshMostafidForms,
  deleteAll
};
