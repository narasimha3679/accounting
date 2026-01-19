import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmployeePayStubs from '../components/employee/EmployeePayStubs';

const EmployeePayStubsPage: React.FC = () => {
    const { user } = useAuth();

    if (!user?.employee?.id) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Employee information not found</p>
            </div>
        );
    }

    return <EmployeePayStubs employeeId={user.employee.id} />;
};

export default EmployeePayStubsPage;
