import { toast } from "sonner"

export const useToast = () => {
  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    options?: {
      description?: string
      duration?: number
    },
  ) => {
    switch (type) {
      case "success":
        toast.success(message, options)
        break
      case "error":
        toast.error(message, options)
        break
      case "warning":
        toast.warning(message, options)
        break
      default:
        toast.info(message, options)
        break
    }
  }

  return { showToast }
}
