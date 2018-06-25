/**
 * This function takes an object like: { firstName: 1, lastName: 1 } and transforms it to `firstName lastName`
 * @param obj
 */
export default function objectToQuery(obj) {
  let str = '';

  for (let i in obj) {
    if (typeof obj[i] === 'object') {
      str +=
        `${i} {
        ${objectToQuery(obj[i])}
      ` + '\n';
    } else {
      str += i + '\n';
    }
  }

  return str;
}
