"use client";
import { type ReactNode } from "react";
import MuiButton from "@mui/material/Button";
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";

export type ButtonVariant = "primary" | "outline" | "ghost" | "secondary";
export type ButtonSize    = "sm" | "md" | "lg";

export interface AppButtonProps extends Omit<MuiButtonProps, "variant" | "size" | "color"> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  icon?:      ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function AppButton({
  variant   = "primary",
  size      = "md",
  icon,
  iconRight,
  fullWidth = false,
  children,
  ...rest
}: AppButtonProps) {
  const muiVariant = variant === "primary" ? "contained" : "outlined";
  const color      = variant === "primary" ? "primary"   : "inherit";
  const muiSize    = size === "sm" ? "small" : size === "lg" ? "large" : "medium";

  return (
    <MuiButton
      variant={muiVariant}
      color={color}
      size={muiSize}
      startIcon={icon}
      endIcon={iconRight}
      fullWidth={fullWidth}
      disableElevation
      {...rest}
    >
      {children}
    </MuiButton>
  );
}