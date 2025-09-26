-- Ensure only one auto monthly record per user/category/month
create unique index if not exists uniq_auto_monthly_records
on records(user_id, ymd, category_code)
where category_code in ('travel_auto','ins_med_auto','ins_car_auto','epf_auto');

