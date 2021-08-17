const errorMissingSeparator = 'Missing separator option.',
  errorNotAnArray = 'Your JSON must be an array or an object.',
  errorItemNotAnObject = 'Item in array is not an object: {0}';

function flattenArray(array, ancestors) {
  ancestors || (ancestors = []);

  function combineKeys(a, b) {
    let result = a.slice(0);
    if (!Array.isArray(b)) return result;
    for (let i = 0; i < b.length; i++) if (result.indexOf(b[i]) === -1) result.push(b[i]);
    return result;
  }

  function extend(target, source) {
    target = target || {};
    for (let prop in source) {
      if (typeof source[prop] === 'object') {
        target[prop] = extend(target[prop], source[prop]);
      } else {
        target[prop] = source[prop];
      }
    }
    return target;
  }

  let rows = [];
  for (let i = 0; i < array.length; i++) {
    let o = array[i],
      row = {},
      orows = {},
      count = 1;

    if (o !== undefined && o !== null && (!isObject(o) || Array.isArray(o)))
      throw errorItemNotAnObject.replace('{0}', JSON.stringify(o));

    let keys = getKeys(o);
    for (let k = 0; k < keys.length; k++) {
      let value = o[keys[k]],
        keyChain = combineKeys(ancestors, [keys[k]]),
        key = keyChain.join('.');
      if (Array.isArray(value)) {
        orows[key] = flattenArray(value, keyChain);
        count += orows[key].length;
      } else {
        row[key] = value;
      }
    }

    if (count == 1) {
      rows.push(row);
    } else {
      let keys = getKeys(orows);
      for (let k = 0; k < keys.length; k++) {
        let key = keys[k];
        for (let r = 0; r < orows[key].length; r++) {
          rows.push(extend(extend({}, row), orows[key][r]));
        }
      }
    }
  }
  return rows;
}

function isObject(o) {
  return o && typeof o == 'object';
}

function getKeys(o) {
  if (!isObject(o)) return [];
  return Object.keys(o);
}

export default function convert(data, options) {
  options || (options = {});

  if (!isObject(data)) throw errorNotAnArray;
  if (!Array.isArray(data)) data = [data];

  let separator = options.separator || ',';
  if (!separator) throw errorMissingSeparator;

  let flatten = options.flatten || false;
  if (flatten) data = flattenArray(data);

  let allKeys = [],
    allRows = [];
  for (let i = 0; i < data.length; i++) {
    let o = data[i],
      row = {};
    if (o !== undefined && o !== null && (!isObject(o) || Array.isArray(o)))
      throw errorItemNotAnObject.replace('{0}', JSON.stringify(o));
    let keys = getKeys(o);
    for (let k = 0; k < keys.length; k++) {
      let key = keys[k];
      if (allKeys.indexOf(key) === -1) allKeys.push(key);
      let value = o[key];
      if (value === undefined && value === null) continue;
      if (typeof value == 'string') {
        row[key] = `"${value.replace(/"/g, options.output_csvjson_variant ? '\\"' : '""')}"`;
        if (options.output_csvjson_variant) row[key] = row[key].replace(/\n/g, '\\n');
      } else {
        row[key] = JSON.stringify(value);
        if (!options.output_csvjson_variant && (isObject(value) || Array.isArray(value)))
          row[key] = `"${row[key].replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      }
    }
    allRows.push(row);
  }

  let keyValues = [];
  for (let i = 0; i < allKeys.length; i++) {
    keyValues.push(`"${allKeys[i].replace(/"/g, options.output_csvjson_variant ? '\\"' : '""')}"`);
  }

  let csv = `${keyValues.join(separator)}\n`;
  for (let r = 0; r < allRows.length; r++) {
    let row = allRows[r],
      rowArray = [];
    for (let k = 0; k < allKeys.length; k++) {
      let key = allKeys[k];
      rowArray.push(row[key] || (options.output_csvjson_variant ? 'null' : ''));
    }
    csv += rowArray.join(separator) + (r < allRows.length - 1 ? '\n' : '');
  }

  return csv;
}
