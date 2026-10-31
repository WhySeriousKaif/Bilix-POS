import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import ShiftReportHeader from "./ShiftReportHeader";
import ShiftInformation from "./ShiftInformation";
import SalesSummery from "./SalesSummery";
import PaymentSummery from "./PaymentSummery";
import TopSellingItems from "./TopSellingItems";
import RecentOrders from "./RecentOrders";
import RefundsTable from "./RefundsTable";
import { shiftReportAPI } from "@/services/api";
import { exportShiftSummaryReportPDF } from "@/utils/reportPdfGenerator";
import { useConfirm } from "@/contexts/ConfirmContext";

const ShiftSummery = () => {
  const { user } = useSelector((state) => state.auth);
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (user?.id) {
      fetchShiftData();
    }
  }, [user]);

  const fetchShiftData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get current shift progress for logged-in cashier
      const data = await shiftReportAPI.getCurrent(user.id);
      setShiftData(data);
    } catch (err) {
      console.error('Error fetching shift data:', err);
      setError(err.message);
      // Never replace failed API data with mock financial totals.
      // A fake zero refund/sales value is misleading in a cashier report.
      setShiftData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (shiftData) {
      exportShiftSummaryReportPDF(shiftData);
    } else {
      window.print();
    }
  };

  const handleEndShift = async () => {
    const shouldEnd = await confirm({
      title: 'End shift and log out?',
      description: 'Are you sure you want to end this cashier shift and log out?',
      confirmLabel: 'End Shift & Logout',
      variant: 'destructive',
    });
    if (!shouldEnd) return;
    try {
      if (shiftData?.id) {
        await shiftReportAPI.endShift(shiftData.id);
      }
      // Clear auth and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } catch (err) {
      console.error('Error ending shift:', err);
      // Still logout even if ending shift fails
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
  };

  const handleStartShift = async () => {
    try {
      setLoading(true);
      // We need branchId. User object has it? 
      // user.branchId or user.store?.branches? -> let's assume user.branchId exists or fallback.
      // Actually OrderServiceImpl logic suggests user has branch.
      await shiftReportAPI.startShift(user.id, user.branchId || 1);
      await fetchShiftData();
    } catch (err) {
      console.error("Failed to manual start shift:", err);
      setError("Failed to start shift: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading shift data...</p>
      </div>
    );
  }

  const isShiftActive = shiftData && shiftData.shiftStart && !shiftData.shiftEnd;

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220]">
      <ShiftReportHeader
        onPrint={handlePrint}
        onEndShift={handleEndShift}
        onStartShift={handleStartShift}
        shiftStarted={isShiftActive}
      />
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <ShiftInformation shiftData={shiftData} />
          <SalesSummery shiftData={shiftData} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <PaymentSummery paymentSummaries={shiftData?.paymentSummaries} />
          <TopSellingItems topSellingProducts={shiftData?.topSellingProducts} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <RecentOrders recentOrders={shiftData?.recentOrders} />
          <RefundsTable refunds={shiftData?.refunds} />
        </div>
      </div>
    </div>
  );
};

export default ShiftSummery;
