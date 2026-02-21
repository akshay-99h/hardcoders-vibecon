import math
from typing import Dict

class CalculatorTools:
    """Tool layer for calculators and fraud scoring"""
    
    @staticmethod
    def calculate_emi(principal: float, interest_rate: float, tenure_months: int) -> Dict:
        """Calculate EMI (Equated Monthly Installment)
        
        Args:
            principal: Loan amount
            interest_rate: Annual interest rate (in percentage)
            tenure_months: Loan tenure in months
        
        Returns:
            Dictionary with EMI, total amount, and total interest
        """
        # Convert annual rate to monthly and percentage to decimal
        monthly_rate = (interest_rate / 12) / 100
        
        if monthly_rate == 0:
            emi = principal / tenure_months
        else:
            emi = principal * monthly_rate * math.pow(1 + monthly_rate, tenure_months) / \
                  (math.pow(1 + monthly_rate, tenure_months) - 1)
        
        total_amount = emi * tenure_months
        total_interest = total_amount - principal
        
        return {
            "emi": round(emi, 2),
            "total_amount": round(total_amount, 2),
            "total_interest": round(total_interest, 2),
            "principal": principal,
            "interest_rate": interest_rate,
            "tenure_months": tenure_months
        }
    
    @staticmethod
    def calculate_simple_interest(principal: float, rate: float, time_years: float) -> Dict:
        """Calculate simple interest
        
        Args:
            principal: Principal amount
            rate: Annual interest rate (in percentage)
            time_years: Time period in years
        
        Returns:
            Dictionary with interest and total amount
        """
        interest = (principal * rate * time_years) / 100
        total_amount = principal + interest
        
        return {
            "interest": round(interest, 2),
            "total_amount": round(total_amount, 2),
            "principal": principal,
            "rate": rate,
            "time_years": time_years
        }
    
    @staticmethod
    def calculate_compound_interest(principal: float, rate: float, time_years: float, 
                                   compounds_per_year: int = 1) -> Dict:
        """Calculate compound interest
        
        Args:
            principal: Principal amount
            rate: Annual interest rate (in percentage)
            time_years: Time period in years
            compounds_per_year: Number of times interest is compounded per year
        
        Returns:
            Dictionary with interest and total amount
        """
        amount = principal * math.pow((1 + (rate / (100 * compounds_per_year))), 
                                     compounds_per_year * time_years)
        interest = amount - principal
        
        return {
            "interest": round(interest, 2),
            "total_amount": round(amount, 2),
            "principal": principal,
            "rate": rate,
            "time_years": time_years,
            "compounds_per_year": compounds_per_year
        }
    
    @staticmethod
    def calculate_fraud_probability(indicators: Dict[str, bool]) -> Dict:
        """Calculate fraud probability based on indicators
        
        Args:
            indicators: Dictionary of fraud indicators
                - suspicious_url: Is the URL suspicious?
                - requests_sensitive_data: Does it request sensitive data?
                - urgency_pressure: Does it create urgency/pressure?
                - unofficial_contact: Is it from an unofficial contact?
                - spelling_errors: Are there spelling/grammar errors?
                - asks_for_payment: Does it ask for immediate payment?
        
        Returns:
            Dictionary with fraud probability and risk level
        """
        # Weight each indicator
        weights = {
            "suspicious_url": 0.25,
            "requests_sensitive_data": 0.25,
            "urgency_pressure": 0.15,
            "unofficial_contact": 0.15,
            "spelling_errors": 0.10,
            "asks_for_payment": 0.10
        }
        
        # Calculate weighted score
        score = 0
        triggered_indicators = []
        
        for indicator, value in indicators.items():
            if value and indicator in weights:
                score += weights[indicator]
                triggered_indicators.append(indicator)
        
        # Convert to percentage
        probability = min(100, score * 100)
        
        # Determine risk level
        if probability >= 75:
            risk_level = "very_high"
        elif probability >= 50:
            risk_level = "high"
        elif probability >= 25:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "fraud_probability": round(probability, 2),
            "risk_level": risk_level,
            "triggered_indicators": triggered_indicators,
            "recommendation": CalculatorTools._get_fraud_recommendation(risk_level)
        }
    
    @staticmethod
    def _get_fraud_recommendation(risk_level: str) -> str:
        """Get fraud prevention recommendation based on risk level"""
        recommendations = {
            "very_high": "⚠️ STOP! This is likely a scam. Do not proceed. Report to cybercrime.gov.in",
            "high": "⚠️ High risk of fraud. Verify through official channels before proceeding.",
            "medium": "⚠️ Exercise caution. Double-check the source and verify official contact details.",
            "low": "✅ Low risk, but always verify official sources and never share sensitive data."
        }
        return recommendations.get(risk_level, "Unknown risk level")