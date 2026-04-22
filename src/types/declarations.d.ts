interface Navigator {
  usb: {
    requestDevice(options: { filters: Array<Record<string, number>> }): Promise<any>
  }
  bluetooth: {
    requestDevice(options: { filters: Array<Record<string, unknown>>; optionalServices?: string[] }): Promise<any>
  }
}

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}