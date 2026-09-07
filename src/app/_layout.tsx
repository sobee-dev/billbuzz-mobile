import LoadingScreen from "@/components/LoadingScreen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BusinessProvider, useBusiness } from "@/context/BusinessContext";
import { Redirect, Stack } from "expo-router";
import "../../global.css";

function RootLayoutNav() {
  const { user, isLoading: authLoading } = useAuth();
  const { business, isLoading: businessLoading } = useBusiness();

  if (authLoading || (user && businessLoading)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!business) {
    return <Redirect href="/(onboarding-tabs)/step-1" />;
  }

  const dashboardRoute = user.role === 'owner' ? '/(owner-tabs)/dashboard' : '/(staff-tabs)/dashboard';

  return <Redirect href={dashboardRoute as any} />;
}
export default function RootLayout() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <RootLayoutNav />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="OAuthCallback" />
          <Stack.Screen name="(owner-tabs)" />
          <Stack.Screen name="business-settings" />
          <Stack.Screen name="staff-list" />
          <Stack.Screen name="new-staff" />
          <Stack.Screen name="client-detail" />
          <Stack.Screen name="new-client" />
          <Stack.Screen name="stock-report" />
          <Stack.Screen name="customer-analytics" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="(onboarding-tabs)" />
          <Stack.Screen name="(staff-tabs)" />
          <Stack.Screen name="doc-detail" />
          <Stack.Screen name="new-document" />
          <Stack.Screen name="new-sales-invoice" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="invoice-templates" />
        </Stack>
      </BusinessProvider>
    </AuthProvider>
  );
}

// export default function RootLayout() {
//   return (
//     <AuthProvider>
//       <BusinessProvider>
//         <RootLayoutNav />
//       </BusinessProvider>
//     </AuthProvider>
//   );
// }
    



// export default function RootLayout() {
//   return (
//             <AuthProvider>
//               <BusinessProvider>
//                 <RootLayoutNav />
//                 <Stack screenOptions={{ headerShown: false }}>
              
                  
//                   <Stack.Screen name="splash" /> 
//                   <Stack.Screen name="login" /> 
//                   <Stack.Screen name="register" /> 
//                   <Stack.Screen name="OAuthCallback" />
                
                  
                    
                    
//                   <Stack.Screen name="(owner-tabs)" /> 
//                   <Stack.Screen name="business-settings" />
//                   <Stack.Screen name="staff-list" />
//                   <Stack.Screen name="new-staff"           />
//                   <Stack.Screen name="client-detail"     />
//                   <Stack.Screen name="new-client"        />
//                   <Stack.Screen name="stock-report"        />
//                   <Stack.Screen name="customer-analytics"  />
//                   <Stack.Screen name="analytics"         />
//                   <Stack.Screen name="(onboarding-tabs)" /> 
                  
                  
                
                    
//                   <Stack.Screen name="(staff-tabs)" />
                  
                
//                   <Stack.Screen name="doc-detail"   />
//                   <Stack.Screen name="doc-receipt"  />
//                   <Stack.Screen name="new-document"       />
//                   <Stack.Screen name="new-sales-invoice" />
                  
//                   <Stack.Screen name="settings"          />
                
//                   <Stack.Screen name="invoice-templates"   />
                  
//                 </Stack>
//               </BusinessProvider>
//             </AuthProvider>  
    
//   );
// }

