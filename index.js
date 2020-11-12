const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const dir = './docs';


const parseClassMethodInvoice = async (fileNameList) => {
  const result = {};
  for (let i = 0; i < fileNameList.length; i++) {
    if (/\.pdf/.test(fileNameList[i])) { // .DS_Storeなどが入り込むのを防ぐ
      const filePath = path.join(dir, fileNameList[i]);
      const dataBuffer = fs.readFileSync(filePath);
      await pdf(dataBuffer).then((data) => {
        const textData = data.text.replace(/\n/g, '');

        const invoiceAmount = /(合計\\.*?\\.*?\\)(.*?)(品目)/.exec(textData) ? /(合計\\.*?\\.*?\\)(.*?)(品目)/.exec(textData)[2].replace(/,/g, '') : 0;
        const projectName = /(プロジェクト名：)(.*?)(）)./.exec(textData) ? /(プロジェクト名：)(.*?)(）)./.exec(textData)[2] : null;
        const projectDate = /(件名)(.*?)(クラスメソッド)/.exec(textData) ? /(件名)(.*?)(クラスメソッド)/.exec(textData)[2] : null;

        const invoiceTitle = projectName ? `${projectDate}_${projectName}.pdf` : fileNameList[i]; //想定外の請求書の場合はファイル名をそのまま使用する

        result[fileNameList[i]] = {
          fileName : fileNameList[i],
          invoiceAmount,
          projectName,
          projectDate,
          invoiceTitle
        }
      })
    }
  }
  return result;
}


const renamePDFs = (obj) => {
  Object.keys(obj).forEach((key) => {
    const filePath = path.join(dir, obj[key].fileName);
    const newFilePath = path.join(dir, obj[key].invoiceTitle);
    fs.rename(filePath, newFilePath, err => {
      if (err) throw err;
    });
  })
}


const writeCSV = (obj) => {
  const csvWriter = createCsvWriter({
    path: './invoiceInfo.csv',
    header: [
        {id: 'projectName', title: 'プロジェクト名'},
        {id: 'invoiceAmount', title: '請求金額'}
    ]
  });
  const records = Object.keys(obj).map((key) => {
    return {
      projectName : obj[key].projectName,
      invoiceAmount : obj[key].invoiceAmount,
    }
  });
  csvWriter.writeRecords(records);
}


const handleClassMethodInvoice = async () => {
  const fileNameList = fs.readdirSync(dir);
  const parseResult = await parseClassMethodInvoice(fileNameList);
  renamePDFs(parseResult);
  writeCSV(parseResult);
}


handleClassMethodInvoice();
