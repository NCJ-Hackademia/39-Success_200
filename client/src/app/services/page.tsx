"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { servicesAPI, categoriesAPI, bookingAPI } from "../../lib/api";
import type { Service, User } from "../../types";
import {
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  CheckCircle,
} from "lucide-react";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const router = useRouter();

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (availableOnly) params.available = true;

      const servicesResponse = await servicesAPI.getServices(params);
      setServices(servicesResponse.data || []);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.response?.data?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesResponse = await categoriesAPI.getCategories();
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, availableOnly]);

  const filteredServices = services.filter(
    (service) =>
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleServiceClick = (serviceId: string) => {
    router.push(`/services/${serviceId}`);
  };

  const handleBookService = async (serviceId: string) => {
    try {
      setBookingLoading(serviceId);

      // Create the booking
      const bookingData = {
        service: serviceId,
        // You might want to add more fields like scheduledDate, notes, etc.
        // For now, we'll create a basic booking
      };

      const response = await bookingAPI.createBooking(bookingData);

      if (response.success) {
        // Redirect to the bookings page to show the newly created booking
        router.push(`/consumer-dashboard/bookings`);
      } else {
        throw new Error(response.message || "Failed to create booking");
      }
    } catch (err: any) {
      console.error("Error creating booking:", err);
      // You might want to show a toast notification here
      alert(
        err.response?.data?.message || err.message || "Failed to create booking"
      );
    } finally {
      setBookingLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-300">
            Loading services...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Available Services
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Find and book professional services from verified providers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option
                  key={category._id || category.name}
                  value={category.name}
                >
                  {category.name}
                </option>
              ))}
            </select>

            {/* Availability Filter */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="available"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="available"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Available only
              </label>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-end">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {filteredServices.length} services found
              </span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Services Grid */}
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Card
                key={service.id || service._id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleServiceClick(service.id || service._id)}
              >
                <CardHeader className="">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {service.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-blue-600 font-medium">
                        {service.category}
                      </CardDescription>
                    </div>
                    {service.available && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="">
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {service.description}
                  </p>

                  {/* Provider Info */}
                  {service.provider && typeof service.provider === "object" && (
                    <div className="flex items-center mb-3">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {service.provider.name}
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center mb-4">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-lg font-semibold text-green-600">
                      ${service.price}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleServiceClick(service.id || service._id);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookService(service.id || service._id);
                      }}
                      disabled={
                        !service.available ||
                        bookingLoading === (service.id || service._id)
                      }
                    >
                      {bookingLoading === (service.id || service._id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Booking...
                        </>
                      ) : (
                        "Book Now"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No services found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search criteria or check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
