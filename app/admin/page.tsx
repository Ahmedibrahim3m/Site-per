import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
export const dynamic="force-dynamic";
export default async function AdminPage(){
 const user=await getCurrentUser();
 if(!user)redirect("/?login=1");
 if(user.role!=="ADMIN")redirect("/");
 return <AdminDashboard name={user.name}/>;
}
