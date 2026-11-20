"use client";
import Link from "next/link";
import { Printer } from "lucide-react";
import {useLanguage} from "@/components/language-provider";
/** Navigates to the dedicated A4 print view; does not print the tracking dashboard. */
export default function PrintInvoiceButton({ reference }: { reference: string }) {
 const {t}=useLanguage();
  return <Link className="btn btn-outline print-invoice-button" href={`/order/${encodeURIComponent(reference)}/invoice`}><Printer size={16}/> {t("VIEW / PRINT ORDER SUMMARY")}</Link>;
}
