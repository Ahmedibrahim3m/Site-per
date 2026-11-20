"use client";
import { Printer, FileDown } from "lucide-react";
import {useLanguage} from "@/components/language-provider";
export default function InvoiceActions() {
 const {t}=useLanguage();
  return <div className="invoice-toolbar" aria-label="Invoice actions">
    <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={17}/> {t("PRINT")}</button>
    <button type="button" className="btn btn-dark" title="In the print dialog, choose Save as PDF as your destination" onClick={() => window.print()}><FileDown size={17}/> {t("SAVE AS PDF")}</button>
  </div>;
}
