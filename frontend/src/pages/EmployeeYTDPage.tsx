import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeeYTDSummary from '../components/employee/EmployeeYTDSummary';

const EmployeeYTDPage: React.FC = () => {
    const { user } = useAuth();

    if (!user?.employee?.id) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Employee information not found</p>
            </div>
        );
    }

    return <EmployeeYTDSummary employeeId={user.employee.id} />;
};

export default EmployeeYTDPage;
