import warning from 'warning'


//仅作日志输入
export default function routerWarning(falseToWarn, message, ...args) {
  message = `[react-router] ${message}`
  warning(falseToWarn, message, ...args)
}
