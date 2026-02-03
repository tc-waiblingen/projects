import parsePhoneNumber from 'libphonenumber-js'

function formatPhoneNumber(phoneNumberString) {
  let result = phoneNumberString

  const phoneNumber = parsePhoneNumber(phoneNumberString, {
    defaultCountry: "DE",
  });


  if (phoneNumber) {
    result = phoneNumber.formatNational()
  }

  const components = result.split(" ")
  if (components.length == 2) {
    // Special handling for cases in which there is just an area code and a local number.
    result = components.join(" – ")
  }

  return result
}

function formatPhoneNumberInternational(phoneNumberString) {
  let result = phoneNumberString

  const phoneNumber = parsePhoneNumber(phoneNumberString, {
    defaultCountry: "DE",
  });


  if (phoneNumber) {
    result = phoneNumber.formatInternational()
  }

  // const components = result.split(" ")
  // if (components.length == 2) {
  //   // Special handling for cases in which there is just an area code and a local number.
  //   result = components.join(" – ")
  // }

  return result
}

export { formatPhoneNumber, formatPhoneNumberInternational };