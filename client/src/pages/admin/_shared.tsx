import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

export const statusStyle: Record<string, string> = { "Rascunho": "bg-[#eee4c8] text-[#695411]", "Em revisão": "bg-[#dce7ef] text-[#28516b]", "Aprovada": "bg-[#e1e8d0] text-[#456027]", "Publicada": "bg-[#d8eadc] text-[#2c683b]", "Arquivada": "bg-[#e8e7e2] text-[#5f5d56]" };
export function AdminPage({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: React.ReactNode; children: React.ReactNode }) { return <DashboardLayout><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="editorial-kicker">{eyebrow}</p><h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{title}</h1></div>{action}</div>{children}</div></DashboardLayout>; }
export function EmptyAdmin({ text, href, label }: { text: string; href?: string; label?: string }) { return <div className="admin-card px-6 py-14 text-center"><p className="mx-auto max-w-md text-sm leading-6 text-[#655e52]">{text}</p>{href && <Button asChild className="mt-5 bg-[#242017] text-white"><Link href={href}>{label}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>}</div>; }
